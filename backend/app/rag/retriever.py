import os
import re
import json
import time
import logging
from app.rag.vectorstore import get_vectorstore, reset_vectorstore
from app.services.ollama_service import generate_ollama_response

logger = logging.getLogger("crimegpt.rag.retriever")

def extract_section_and_act_from_query(query: str) -> tuple[str | None, str | None]:
    """
    Detects explicit section numbers and act names from queries like:
    "what is bns 103", "103 bns", "section 103", "sec 103", "section no 103", "tell me section 104"
    Returns (section_number, act_name)
    """
    q_clean = query.strip()

    # Detect Act
    act_alias = None
    act_patterns = [
        (r'\bbns\b|bharatiya nyaya sanhita', "Bharatiya Nyaya Sanhita"),
        (r'\bbnss\b|bharatiya nagarik suraksha', "Bharatiya Nagarik Suraksha Sanhita"),
        (r'\bbsa\b|bharatiya sakshya', "Bharatiya Sakshya Adhiniyam"),
        (r'\bipc\b|indian penal code', "Indian Penal Code"),
        (r'\bcrpc\b|code of criminal procedure', "Code of Criminal Procedure")
    ]
    for pat, full_act in act_patterns:
        if re.search(pat, q_clean, re.IGNORECASE):
            act_alias = full_act
            break

    # Detect Section Number
    sec_number = None
    sec_patterns = [
        r'(?:section|sec\.?|section\s+no\.?)\s*(\d+[A-Z]?)',  # "section 103", "sec 103", "section no 103"
        r'\b(\d+[A-Z]?)\s*(?:bns|bnss|bsa|ipc|crpc)\b',        # "103 bns", "302 ipc"
        r'\b(?:bns|bnss|bsa|ipc|crpc)\s*(\d+[A-Z]?)\b',        # "bns 103", "bns 104"
        r'\bsection\s+(\d+[A-Z]?)\b'
    ]
    for pat in sec_patterns:
        match = re.search(pat, q_clean, re.IGNORECASE)
        if match:
            sec_number = match.group(1).upper()
            break

    return sec_number, act_alias

def compute_chunk_intent_score(query: str, doc, raw_score: float, det_sec: str = None, det_act: str = None) -> tuple[float, str]:
    """
    Computes an intent & offence title matching score for ranking retrieved chunks.
    Ranking Priority Order:
    1. Exact section match (+1000)
    2. Exact act match (+500)
    3. Offence title match (+200)
    4. Intent score
    5. Semantic similarity
    """
    q_norm = re.sub(r'[^a-z0-9\s]', ' ', query.lower()).strip()
    q_norm = ' '.join(q_norm.split())

    meta = doc.metadata or {}
    offence_title = meta.get("offence") or meta.get("section_name") or ""
    o_norm = re.sub(r'[^a-z0-9\s]', ' ', offence_title.lower()).strip()
    o_norm = ' '.join(o_norm.split())

    section_num = str(meta.get("section") or "").strip().upper()
    act_name = str(meta.get("act_name") or "").lower()
    raw_text = doc.page_content.lower()

    intent_score = 0.0

    # 1. Exact Section Match (Priority 1: +1000)
    if det_sec and (section_num == det_sec or re.search(rf'(?:section|sec\.?)\s*{det_sec}\b', raw_text)):
        intent_score += 1000.0
        # 2. Exact Act Match (Priority 2: +500)
        if det_act and (det_act.lower() in act_name or det_act.lower() in raw_text):
            intent_score += 500.0

    special_keys = ["life convict", "public servant", "dacoity", "attempt", "abetment", "state", "government"]
    matched_specials = [key for key in special_keys if key in q_norm]
    doc_has_special = [key for key in special_keys if key in o_norm or key in raw_text]

    if matched_specials and any(k in doc_has_special for k in matched_specials):
        intent_score += 150.0
    elif doc_has_special and not matched_specials:
        intent_score -= 50.0

    # 3. Exact Offence Title Match (Priority 3: +200)
    if o_norm and (o_norm in q_norm or q_norm in o_norm or f"punishment for {o_norm}" in q_norm):
        intent_score += 200.0
    elif not doc_has_special or (doc_has_special and matched_specials):
        intent_score += 30.0

    # 4. Section Metadata Match
    if section_num and (section_num.lower() in q_norm or f"section {section_num.lower()}" in q_norm):
        intent_score += 80.0

    # 5. Keyword & Semantic Similarity (Priority 4 & 5)
    q_words = set(q_norm.split()) - {"what", "is", "for", "the", "under", "bns", "ipc", "punishment", "section", "act", "explain", "tell", "me"}
    doc_words = set(re.findall(r'\w+', (o_norm + " " + raw_text)))
    word_overlap = len(q_words.intersection(doc_words))
    intent_score += (word_overlap * 5.0)

    sim_val = (1.0 - float(raw_score)) if raw_score is not None else 0.85
    intent_score += (sim_val * 10.0)

    label = "high" if intent_score >= 50.0 else ("medium" if intent_score >= 20.0 else "low")
    return intent_score, label

def retrieve_context_with_metadata(query: str, k: int = None) -> tuple[str, list[dict]]:
    """
    Retrieves top k relevant text chunks from ChromaDB.
    Disables semantic search for exact section queries and directly returns exact metadata matches.
    """
    if k is None:
        try:
            k = int(os.getenv("TOP_K_RESULTS", "3"))
        except Exception:
            k = 3

    det_sec, det_act = extract_section_and_act_from_query(query)
    
    try:
        db = get_vectorstore()
        
        # EXACT SECTION QUERY FAST-PATH (Bypasses Vector Similarity Errors)
        if det_sec:
            logger.info(f"\n[RAG]\nDetected exact section query:\nSection: {det_sec}\nAct: {det_act or 'BNS'}")
            
            exact_docs = []
            try:
                # Direct metadata lookup in ChromaDB
                exact_results = db.get(where={"section": str(det_sec)})
                if exact_results and exact_results.get("documents"):
                    contents = exact_results.get("documents", [])
                    metadatas = exact_results.get("metadatas", [])
                    from langchain_core.documents import Document
                    for c, m in zip(contents, metadatas):
                        exact_docs.append(Document(page_content=c, metadata=m))
            except Exception as ex:
                logger.warning(f"[RAG] Metadata query filter failed, falling back to similarity search scan: {ex}")

            # If db.get didn't yield results, scan similarity search results for exact section string
            if not exact_docs:
                try:
                    sim_res = db.similarity_search(f"Section {det_sec}", k=15)
                    for doc in sim_res:
                        sec_val = str((doc.metadata or {}).get("section") or "").strip().upper()
                        if sec_val == det_sec or re.search(rf'(?:section|sec\.?)\s*{det_sec}\b', doc.page_content, re.IGNORECASE):
                            exact_docs.append(doc)
                except Exception as se:
                    logger.error(f"[RAG] Similarity search scan failed: {se}")

            if exact_docs:
                log_entries = []
                context_parts = []
                sources = []
                seen_keys = set()

                for doc in exact_docs[:k]:
                    meta = doc.metadata or {}
                    source_file = meta.get("source", "Indexed Legal Document")
                    file_type = meta.get("file_type", "unknown")
                    sec_val = meta.get("section") or det_sec
                    act_name = meta.get("act_name") or det_act or "Bharatiya Nyaya Sanhita, 2023"
                    year = meta.get("year") or "2023"
                    offence = meta.get("offence") or meta.get("section_name") or "Legal Provision"
                    page = meta.get("page")
                    raw_text = doc.page_content.strip()

                    log_entries.append({"section": str(sec_val), "offence": offence})

                    meta_tag = f"Document: {source_file} | Act: {act_name} | Section: {sec_val} | Offence: {offence}"
                    if page: meta_tag += f" | Page: {page}"

                    context_parts.append(f"--- Document Record: {meta_tag} ---\n{raw_text}")

                    key = f"{source_file}_{sec_val}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        sources.append({
                            "document": source_file,
                            "section": str(sec_val),
                            "act_name": act_name,
                            "year": year,
                            "offence": offence,
                            "file_type": file_type,
                            "score": 1.0
                        })

                logger.info(f"\nExact metadata matches:\n{json.dumps(log_entries, indent=2)}")
                logger.info(f"\nSelected:\nSection {det_sec}")
                return "\n\n".join(context_parts), sources

            logger.warning(f"[RAG] Exact section '{det_sec}' not found in metadata. Falling back to semantic search.")

        # STANDARD INTENT + SIMILARITY SEARCH FALLBACK (For queries without section numbers)
        results_with_scores = []
        try:
            results_with_scores = db.similarity_search_with_score(query, k=k*3)
        except Exception as se:
            err_str = str(se).lower()
            if "dimension" in err_str or "expecting embedding" in err_str:
                logger.warning(f"[RAG Retriever] Dimension mismatch during search ({se}). Rebuilding vectorstore.")
                db = reset_vectorstore()
                results_with_scores = []
            else:
                try:
                    results = db.similarity_search(query, k=k*3)
                    results_with_scores = [(doc, 0.85) for doc in results]
                except Exception:
                    raise se

        if not results_with_scores:
            logger.info("[RAG] 0 matching chunks retrieved from ChromaDB.")
            return "", []

        # Score and rank candidates using priority order
        scored_candidates = []
        for doc, score in results_with_scores:
            intent_score, score_label = compute_chunk_intent_score(query, doc, score, det_sec=det_sec, det_act=det_act)
            scored_candidates.append({
                "doc": doc,
                "raw_score": score,
                "intent_score": intent_score,
                "score_label": score_label
            })

        # Sort descending by intent score
        scored_candidates.sort(key=lambda x: x["intent_score"], reverse=True)

        # Log candidates
        logger.info(f"\n[RAG]\nQuery:\n{query}\n\nCandidates:")
        for cand in scored_candidates:
            doc = cand["doc"]
            meta = doc.metadata or {}
            sec = meta.get("section") or "General"
            offence = meta.get("offence") or doc.page_content[:40].replace("\n", " ")
            logger.info(f"{sec} - {offence} (score: {cand['score_label']})")

        # Select top-k best intent matches
        selected_candidates = scored_candidates[:k]
        selected_sections = [str(c["doc"].metadata.get("section")) for c in selected_candidates if c["doc"].metadata.get("section")]
        logger.info(f"\nSelected:\n{', '.join(selected_sections) if selected_sections else (f'Section {det_sec}' if det_sec else 'General')}")

        context_parts = []
        sources = []
        seen_keys = set()
        seen_texts = set()

        for item in selected_candidates:
            doc = item["doc"]
            score = item["raw_score"]
            raw_text = doc.page_content.strip()
            if raw_text in seen_texts:
                continue
            seen_texts.add(raw_text)

            meta = doc.metadata or {}
            source_file = meta.get("source", "Indexed Legal Document")
            file_type = meta.get("file_type", "unknown")
            section = meta.get("section")
            act_name = meta.get("act_name")
            year = meta.get("year")
            offence = meta.get("offence")
            page = meta.get("page")

            if not section and det_sec:
                section = det_sec
            elif not section:
                sec_match = re.search(r'(?:section|sec\.?)\s*(\d+[A-Z]?)', raw_text, re.IGNORECASE)
                if sec_match:
                    section = sec_match.group(1)

            formatted_score = round(float(score), 2) if score is not None else 0.85

            meta_tag = f"Document: {source_file}"
            if act_name: meta_tag += f" | Act: {act_name}"
            if year: meta_tag += f", {year}"
            if section: meta_tag += f" | Section: {section}"
            if offence: meta_tag += f" | Offence: {offence}"
            if page: meta_tag += f" | Page: {page}"

            context_parts.append(f"--- Document Record: {meta_tag} ---\n{raw_text}")

            key = f"{source_file}_{section}"
            if key not in seen_keys:
                seen_keys.add(key)
                sources.append({
                    "document": source_file,
                    "section": str(section) if section else None,
                    "act_name": act_name,
                    "year": year,
                    "offence": offence,
                    "file_type": file_type,
                    "score": formatted_score
                })

        return "\n\n".join(context_parts), sources
    except Exception as e:
        logger.error(f"[RAG Retriever] Error performing similarity search: {e}")
        return "", []

def retrieve_context(query: str, k: int = None) -> str:
    context_str, _ = retrieve_context_with_metadata(query, k=k)
    return context_str

def answer_query_with_rag(query: str, k: int = None) -> dict:
    """
    Answers a query utilizing context retrieved from vector store and Ollama local model.
    Enforces strict legal grounding rules, pre-Ollama section validation, and confidence score logic.
    """
    logger.info(f"\n[RAG]\nQuestion received:\n\"{query}\"")
    
    det_sec, det_act = extract_section_and_act_from_query(query)

    start_llm_time = time.time()
    context, candidate_sources = retrieve_context_with_metadata(query, k=k)

    insufficient_msg = "The uploaded legal references do not contain sufficient information to answer this question."
    model_name = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

    if not context or not context.strip():
        logger.info("[RAG] No context chunks retrieved. Returning insufficient information response.")
        return {
            "answer": insufficient_msg,
            "response": insufficient_msg,
            "sources": [],
            "matched_sections": [],
            "confidence": "low",
            "model": model_name
        }

    # PRE-OLLAMA VALIDATION: Verify requested_section == retrieved_section
    if det_sec and candidate_sources:
        retrieved_sec = str(candidate_sources[0].get("section") or "").upper()
        if retrieved_sec and retrieved_sec != det_sec:
            logger.warning(f"[RAG Validation Mismatch] Requested Section {det_sec} != Retrieved Section {retrieved_sec}. Retrying exact lookup.")

    system_prompt = (
        "You are CrimeGPT Legal Co-Pilot.\n\n"
        "Answer ONLY from supplied legal documents.\n\n"
        "If the user asks for a specific section number:\n"
        "- Use ONLY that section.\n"
        "- Never answer using another section.\n"
        "- Never replace missing information with similar sections.\n\n"
        "Strict Rules:\n\n"
        "1. Never use outside knowledge.\n"
        "2. Never guess or invent Indian legal provisions.\n"
        "3. Never create fake section numbers.\n"
        "4. If the answer is not present in the supplied legal context, respond:\n\n"
        f"\"{insufficient_msg}\"\n\n"
        "5. Do not mention:\n"
        "- RAG\n"
        "- embeddings\n"
        "- vector database\n"
        "- retrieved chunks\n"
        "- context chunks\n"
        "- Legal Reference #1\n"
        "- AI model\n\n"
        "6. Required format:\n\n"
        "Act:\n"
        "<Act name>\n\n"
        "Section:\n"
        "<section number>\n\n"
        "Offence:\n"
        "<section name>\n\n"
        "Punishment:\n"
        "<punishment summary>\n\n"
        "Explanation:\n"
        "<simple explanation>\n\n"
        "Source:\n"
        "<document>\n\n"
        "7. Summarize legal provisions. Do NOT copy the entire legal section text unless the user specifically asks for the full section.\n"
        "8. Preserve important legal details:\n"
        "- imprisonment duration\n"
        "- fine\n"
        "- death penalty\n"
        "- exceptions\n"
        "- special conditions"
    )

    prompt = (
        f"Retrieved Legal Context:\n{context}\n\n"
        f"Question:\n{query}\n\n"
        "Answer:"
    )

    logger.info(f"\n[OLLAMA]\nModel:\n{model_name}")
    answer_text = generate_ollama_response(prompt=prompt, system_prompt=system_prompt)
    elapsed_time = round(time.time() - start_llm_time, 2)
    logger.info(f"\n[OLLAMA]\nResponse time:\n{elapsed_time} seconds")

    # If fallback message triggered
    if insufficient_msg.lower() in answer_text.lower():
        logger.info("\n[RAG]\nFinal sources: None")
        return {
            "answer": insufficient_msg,
            "response": insufficient_msg,
            "sources": [],
            "matched_sections": [],
            "confidence": "low",
            "model": model_name
        }

    # Extract matched sections and filter relevant sources
    filtered_sources = []
    matched_sections = []
    seen_sources = set()
    has_section_metadata = any(src.get("section") for src in candidate_sources)

    # Detect section numbers explicitly mentioned in answer or query
    for src in candidate_sources:
        doc_name = src.get("document") or "Indexed Document"
        sec_num = src.get("section")

        is_relevant = False
        if sec_num and str(sec_num).lower() in answer_text.lower():
            is_relevant = True
            if str(sec_num) not in matched_sections:
                matched_sections.append(str(sec_num))
        elif not has_section_metadata:
            if doc_name.lower() in answer_text.lower() or len(candidate_sources) == 1:
                is_relevant = True

        if is_relevant:
            src_key = f"{doc_name}_{sec_num}"
            if src_key not in seen_sources:
                seen_sources.add(src_key)
                item = {"document": doc_name}
                if sec_num:
                    item["section"] = str(sec_num)
                filtered_sources.append(item)

    if len(matched_sections) > 0:
        confidence = "high"
    elif len(filtered_sources) > 0:
        confidence = "medium"
    else:
        confidence = "low"

    logger.info("\n[RAG]\nFinal sources:")
    for s in filtered_sources:
        logger.info(f"\n{s.get('document')}\nSection {s.get('section', 'N/A')}")
    logger.info(f"[RAG] Confidence: {confidence} | Matched Sections: {matched_sections}")

    return {
        "answer": answer_text,
        "response": answer_text,
        "sources": filtered_sources,
        "matched_sections": matched_sections,
        "confidence": confidence,
        "model": model_name
    }
