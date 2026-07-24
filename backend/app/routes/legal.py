import os
import shutil
import logging
import json
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.rag.loader import load_and_chunk_file
from app.rag.vectorstore import add_documents_to_store
from app.rag.retriever import answer_query_with_rag, retrieve_context
from app.routes.deps import RoleChecker

logger = logging.getLogger("crimegpt.routes.legal")

# Secure legal search/indexing to ADMIN and POLICE_OFFICER roles
router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]))])

@router.get("/recommendations")
def get_recommendations(crime_type: str):
    """
    Get legal recommendations mapped in legal_sections.json by crime_type.
    """
    import json
    data_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data"
    )
    filepath = os.path.join(data_dir, "legal_sections.json")
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                if item.get("crime_type").lower() == crime_type.lower():
                    return item.get("sections", [])
            return []
    except Exception as e:
        logger.error(f"Error reading recommendations: {e}")
        return []

class QueryRequest(BaseModel):
    query: str

ALLOWED_EXTENSIONS = {".pdf", ".csv", ".docx", ".doc", ".txt", ".json", ".md", ".markdown"}

@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_legal_document(file: UploadFile = File(...)):
    """
    Upload a legal reference document (PDF, CSV, DOCX, TXT, JSON, MD), parse it, chunk content,
    generate local embeddings, and index it inside ChromaDB with source metadata.
    """
    filename = file.filename or "document"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, CSV, DOCX, TXT, JSON, MD."
        )

    # Save to a local temporary directory inside the workspace
    temp_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "temp_uploads"
    )
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, filename)

    try:
        # Write binary stream to file
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract structured text documents with format-specific metadata
        chunks = load_and_chunk_file(temp_file_path, filename)
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"The uploaded file '{filename}' does not contain any extractable text."
            )

        # Embed locally using SentenceTransformers and index chunks inside ChromaDB
        add_documents_to_store(chunks)

        return {
            "filename": filename,
            "file_type": ext[1:],
            "chunks_added": len(chunks),
            "status": "indexed successfully"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed processing document upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing and indexing the document: {str(e)}"
        )
    finally:
        # Cleanup temporary uploaded file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                logger.warning(f"Could not clean up temp file {temp_file_path}: {e}")

@router.post("/query")
def query_legal_database(request: QueryRequest):
    """
    Accepts an analytical query, retrieves relevant legal context from ChromaDB using local query embeddings,
    and returns an Ollama-generated answer strictly grounded in retrieved context along with source citations.
    """
    try:
        rag_result = answer_query_with_rag(request.query)
        model_name = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
        if isinstance(rag_result, dict):
            return {
                "query": request.query,
                "answer": rag_result.get("answer", ""),
                "response": rag_result.get("answer", ""),
                "sources": rag_result.get("sources", []),
                "matched_sections": rag_result.get("matched_sections", []),
                "confidence": rag_result.get("confidence", "low"),
                "model": rag_result.get("model", model_name)
            }
        return {
            "query": request.query,
            "answer": str(rag_result),
            "response": str(rag_result),
            "sources": [],
            "matched_sections": [],
            "confidence": "low",
            "model": model_name
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"RAG query execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while answering the query: {str(e)}"
        )

class CaseQueryRequest(BaseModel):
    case_id: int
    query: str
    history: list[dict] = []

@router.post("/query/case")
def query_legal_case_database(
    request: CaseQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Query CrimeGPT AI Assistant preloaded with the specific Case context.
    RAG-grounded and supports conversation memory.
    """
    from app.models.case import Case
    
    # 1. Fetch case details
    case = db.query(Case).filter(Case.id == request.case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {request.case_id} not found."
        )
        
    # Compile Case Data Profile
    details = case.details
    evidence_names = [ev.file_name for ev in case.evidence]
    doc_types = [doc.document_type for doc in case.documents]
    timeline_logs = [f"[{t.event_name}] {t.description} ({t.timestamp.strftime('%Y-%m-%d')})" for t in case.timeline]

    # Format BNS Legal Sections
    legal_sections_str = "None"
    if details and details.legal_sections:
        try:
            sec_list = json.loads(details.legal_sections)
            if isinstance(sec_list, list):
                legal_sections_str = ", ".join([f"{sec.get('law')} {sec.get('section')} ({sec.get('title')})" for sec in sec_list])
        except Exception:
            pass

    # Format Witnesses from both JSON column and Witnesses table
    witnesses_list = []
    if details and details.witnesses:
        try:
            parsed_w = json.loads(details.witnesses)
            if isinstance(parsed_w, list):
                for w in parsed_w:
                    witnesses_list.append(f"{w.get('name')} (Statement: {w.get('statement')})")
        except Exception:
            pass
    for w in case.witness_records:
        witnesses_list.append(f"{w.name} (Status: {w.status}, Statement: {w.statement})")

    # Format Suspects from both JSON column and Suspects table
    suspects_list = []
    if details and details.accused_details:
        try:
            parsed_a = json.loads(details.accused_details)
            if isinstance(parsed_a, dict):
                suspects_list.append(f"{parsed_a.get('name')} (Age: {parsed_a.get('age')})")
            elif isinstance(parsed_a, list):
                for a in parsed_a:
                    suspects_list.append(f"{a.get('name')}")
        except Exception:
            pass
    for s in case.suspect_records:
        suspects_list.append(f"{s.name} (Alias: {s.alias}, Status: {s.status}, Notes: {s.notes})")

    case_profile = (
        f"CASE DETAILS PROFILE:\n"
        f"- FIR Number: {case.fir_number}\n"
        f"- Police Station: {case.police_station}\n"
        f"- Crime Category: {case.crime_type}\n"
        f"- Occurrence Date/Time: {case.incident_date}\n"
        f"- Status: {case.status}\n"
        f"- Complainant / Victim: {details.victim_details if details else 'None'}\n"
        f"- Accused / Suspect Person(s): {', '.join(suspects_list) if suspects_list else 'None'}\n"
        f"- Narrative Summary: {details.incident_description if details else 'None'}\n"
        f"- Penal Code Sections (IPC): {details.ipc_sections if details else 'None'}\n"
        f"- BNS Legal Sections: {legal_sections_str}\n"
        f"- Witnesses: {', '.join(witnesses_list) if witnesses_list else 'None'}\n"
        f"- Physical Evidence Files Uploaded: {', '.join(evidence_names) if evidence_names else 'No files uploaded'}\n"
        f"- Generated AI Documents: {', '.join(doc_types) if doc_types else 'No documents generated'}\n"
        f"- Case Timeline Milestones:\n  * " + "\n  * ".join(timeline_logs) if timeline_logs else "No timeline logs registered"
    )

    # 2. Retrieve semantic context from legal database (RAG)
    retrieved_context = retrieve_context(request.query)

    # 3. Format Conversation History (Memory)
    history_str = ""
    if request.history:
        history_parts = []
        for msg in request.history:
            role = "Officer" if msg.get("role") == "user" else "CrimeGPT"
            history_parts.append(f"{role}: {msg.get('content')}")
        history_str = "CONVERSATION HISTORY MEMORY:\n" + "\n".join(history_parts) + "\n\n"

    # 4. Compose rich system prompt
    prompt = (
        "You are CrimeGPT, an expert Indian legal investigator and senior police AI co-pilot.\n"
        "You are assisting an officer with the specific case file profile described below.\n\n"
        "--- START CASE DATA PROFILE ---\n"
        f"{case_profile}\n"
        "--- END CASE DATA PROFILE ---\n\n"
    )

    if retrieved_context:
        prompt += (
            "--- START RETRIEVED LEGAL CONTEXT (RAG) ---\n"
            f"{retrieved_context}\n"
            "--- END RETRIEVED LEGAL CONTEXT (RAG) ---\n\n"
        )

    prompt += (
        "INSTRUCTIONS:\n"
        "- Answer the officer's query based strictly on the Case Profile, the custom legal context, and standard Indian penal law (IPC/CrPC/BNS).\n"
        "- Do NOT invent facts or guess about the Case details. If the case profile lacks certain information (e.g. Complainant details, specific item sizes), state clearly that it is missing.\n"
        "- If asked to prepare questions for a witness, verify the case facts (who is the victim, what happened, what evidence is collected) and draft professional, highly targeted questions.\n"
        "- Respond in a direct, professional, and clear officer-oriented tone.\n\n"
        f"{history_str}"
        f"Officer's Query: {request.query}\n\n"
        "CrimeGPT Response:"
    )

    try:
        from app.services.ai_service import generate_ai_response
        response = generate_ai_response(prompt=prompt)
        return {
            "case_id": request.case_id,
            "response": response
        }
    except Exception as e:
        logger.error(f"Contextual case query failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI resolution failed: {str(e)}"
        )
