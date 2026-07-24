import json
from datetime import datetime
from sqlalchemy.orm import Session, joinedload, selectinload
from fastapi import HTTPException, status
from app.models.case import Case
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentGenerateRequest
from app.ai.prompts import get_prompt_template
from app.ai.gemini import generate_document
from app.ai.docx_generator import generate_filled_docx_and_pdf
from app.utils.document_validator import clean_and_validate_generated_document

def format_witnesses_for_prompt(db_case: Case) -> str:
    witness_list = []

    # 1. Check witness_records relationship
    if hasattr(db_case, "witness_records") and db_case.witness_records:
        for w in db_case.witness_records:
            witness_list.append({
                "name": getattr(w, "name", None),
                "phone": getattr(w, "phone", None),
                "address": getattr(w, "address", None),
                "statement": getattr(w, "statement", None),
                "status": getattr(w, "status", None),
                "is_panch": getattr(w, "is_panch", False) or str(getattr(w, "witness_type", "")).lower() == "panch"
            })

    # 2. Check JSON details.witnesses
    details = db_case.details
    if details and details.witnesses:
        raw = details.witnesses
        try:
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            if isinstance(parsed, list):
                for w in parsed:
                    if isinstance(w, dict):
                        w_name = w.get("name") or w.get("witness_name")
                        if w_name and not any(existing.get("name") == w_name for existing in witness_list):
                            witness_list.append({
                                "name": w_name,
                                "phone": w.get("contact") or w.get("phone"),
                                "address": w.get("address"),
                                "statement": w.get("statement"),
                                "status": w.get("status"),
                                "is_panch": w.get("is_panch", False) or str(w.get("witness_type", "")).lower() == "panch"
                            })
        except Exception:
            pass

    if not witness_list:
        return "No witness information is available."

    blocks = []
    for idx, w in enumerate(witness_list):
        w_details = []
        w_label = "Panch Witness" if w.get("is_panch") else "Witness"
        if w.get("name") and str(w["name"]).strip():
            w_details.append(f"    - Name: {w['name'].strip()}")
        if w.get("phone") and str(w["phone"]).strip():
            w_details.append(f"    - Contact/Phone: {w['phone'].strip()}")
        if w.get("address") and str(w["address"]).strip():
            w_details.append(f"    - Address: {w['address'].strip()}")
        if w.get("statement") and str(w["statement"]).strip():
            w_details.append(f"    - Statement: {w['statement'].strip()}")
        if w.get("status") and str(w["status"]).strip():
            w_details.append(f"    - Status: {w['status'].strip()}")
        if w_details:
            blocks.append(f"  {w_label} #{idx+1}:\n" + "\n".join(w_details))

    return "\n\n".join(blocks) if blocks else "No witness information is available."

def format_evidence_for_prompt(db_case: Case) -> str:
    evidence_list = []

    # 1. Check evidence relationship
    if hasattr(db_case, "evidence") and db_case.evidence:
        for ev in db_case.evidence:
            evidence_list.append({
                "file_name": getattr(ev, "file_name", None),
                "evidence_type": getattr(ev, "evidence_type", None) or getattr(ev, "file_type", None),
                "description": getattr(ev, "description", None),
                "collection_location": getattr(ev, "collection_location", None),
                "collecting_officer": getattr(ev, "collecting_officer", None),
                "collection_date": str(getattr(ev, "collection_date", "")) if getattr(ev, "collection_date", None) else None
            })

    # 2. Check JSON details.evidence_details
    details = db_case.details
    if details and details.evidence_details:
        raw = details.evidence_details
        try:
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            if isinstance(parsed, list):
                for ev in parsed:
                    if isinstance(ev, dict):
                        ev_name = ev.get("description") or ev.get("evidence_type") or ev.get("uploaded_file")
                        if ev_name and not any(existing.get("description") == ev_name or existing.get("file_name") == ev_name for existing in evidence_list):
                            evidence_list.append({
                                "file_name": ev.get("uploaded_file") or ev_name,
                                "evidence_type": ev.get("evidence_type") or ev.get("file_type"),
                                "description": ev.get("description"),
                                "collection_location": ev.get("recovered_from") or ev.get("collection_location"),
                                "collecting_officer": ev.get("officer_remarks") or ev.get("collecting_officer"),
                                "collection_date": ev.get("recovery_date")
                            })
        except Exception:
            pass

    if not evidence_list:
        return "No evidence items recorded in database."

    blocks = []
    for idx, ev in enumerate(evidence_list):
        ev_details = []
        if ev.get("file_name") and str(ev["file_name"]).strip():
            ev_details.append(f"    - Item/File Name: {ev['file_name'].strip()}")
        if ev.get("evidence_type") and str(ev["evidence_type"]).strip():
            ev_details.append(f"    - Category/Type: {ev['evidence_type'].strip()}")
        if ev.get("description") and str(ev["description"]).strip():
            ev_details.append(f"    - Description: {ev['description'].strip()}")
        if ev.get("collection_location") and str(ev["collection_location"]).strip():
            ev_details.append(f"    - Recovery Location: {ev['collection_location'].strip()}")
        if ev.get("collecting_officer") and str(ev["collecting_officer"]).strip():
            ev_details.append(f"    - Collecting Officer / Remarks: {ev['collecting_officer'].strip()}")
        if ev.get("collection_date") and str(ev["collection_date"]).strip():
            ev_details.append(f"    - Date of Recovery/Seizure: {ev['collection_date'].strip()}")
        if ev_details:
            blocks.append(f"  Evidence Item #{idx+1}:\n" + "\n".join(ev_details))

    return "\n\n".join(blocks) if blocks else "No evidence items recorded in database."

def format_accused_for_prompt(db_case: Case) -> str:
    accused_list = []

    # 1. Check suspect_records relationship
    if hasattr(db_case, "suspect_records") and db_case.suspect_records:
        for s in db_case.suspect_records:
            accused_list.append({
                "name": getattr(s, "name", None),
                "alias": getattr(s, "alias", None),
                "address": getattr(s, "address", None),
                "status": getattr(s, "status", None),
                "identification_marks": getattr(s, "identification_marks", None),
                "notes": getattr(s, "notes", None)
            })

    # 2. Check JSON details.accused_details
    details = db_case.details
    if details and details.accused_details:
        raw = details.accused_details
        try:
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            if isinstance(parsed, dict) and parsed.get("name"):
                if not any(existing.get("name") == parsed.get("name") for existing in accused_list):
                    accused_list.append(parsed)
            elif isinstance(parsed, list):
                for acc in parsed:
                    if isinstance(acc, dict) and acc.get("name"):
                        if not any(existing.get("name") == acc.get("name") for existing in accused_list):
                            accused_list.append(acc)
        except Exception:
            pass

    if not accused_list:
        return "Not specified"

    blocks = []
    for idx, acc in enumerate(accused_list):
        acc_details = []
        if isinstance(acc, dict):
            for k, v in acc.items():
                if v and str(v).strip():
                    acc_details.append(f"    - {k.replace('_', ' ').title()}: {str(v).strip()}")
        if acc_details:
            blocks.append(f"  Accused/Suspect #{idx+1}:\n" + "\n".join(acc_details))

    return "\n\n".join(blocks) if blocks else "Not specified"

def format_victim_for_prompt(db_case: Case) -> str:
    details = db_case.details
    if not details or not details.victim_details:
        return "Not specified"

    val = details.victim_details
    try:
        parsed = json.loads(val) if isinstance(val, str) else val
        if isinstance(parsed, dict):
            items = [f"  - {k.replace('_', ' ').title()}: {str(v).strip()}" for k, v in parsed.items() if v and str(v).strip()]
            return "\n".join(items) if items else "Not specified"
        elif isinstance(parsed, list):
            blocks = []
            for idx, vic in enumerate(parsed):
                if isinstance(vic, dict):
                    v_items = [f"    * {k.replace('_', ' ').title()}: {str(v).strip()}" for k, v in vic.items() if v and str(v).strip()]
                    if v_items:
                        blocks.append(f"  Victim #{idx+1}:\n" + "\n".join(v_items))
            return "\n\n".join(blocks) if blocks else "Not specified"
    except Exception:
        pass
    return str(val).strip() if val and str(val).strip() else "Not specified"

def build_prompt(db_case: Case, template: str) -> str:
    details = db_case.details

    # Format legal sections from JSON or fallback
    legal_sections_str = "Not specified"
    if details:
        if details.legal_sections:
            try:
                sections_list = json.loads(details.legal_sections) if isinstance(details.legal_sections, str) else details.legal_sections
                if isinstance(sections_list, list):
                    legal_sections_str = ", ".join([f"{sec.get('law')} {sec.get('section')} ({sec.get('title')})" for sec in sections_list])
                elif details.ipc_sections:
                    legal_sections_str = str(details.ipc_sections)
            except Exception:
                if details.ipc_sections:
                    legal_sections_str = str(details.ipc_sections)
        elif details.ipc_sections:
            legal_sections_str = str(details.ipc_sections)

    # Retrieve RAG context
    from app.rag.retriever import retrieve_context
    crime_category = db_case.crime_category or db_case.crime_type
    rag_query = f"{crime_category} {legal_sections_str}"
    try:
        rag_context = retrieve_context(rag_query, k=3)
    except Exception:
        rag_context = ""
    if not rag_context:
        rag_context = "No custom indexed legal manual references found in ChromaDB."

    investigating_officer = "Not specified"
    if details and details.investigating_officer and details.investigating_officer.strip():
        investigating_officer = details.investigating_officer.strip()

    victim_str = format_victim_for_prompt(db_case)
    accused_str = format_accused_for_prompt(db_case)
    witnesses_str = format_witnesses_for_prompt(db_case)
    evidence_str = format_evidence_for_prompt(db_case)

    narrative = "Not specified"
    if details:
        if details.incident_description and details.incident_description.strip():
            narrative = details.incident_description.strip()
        elif details.description and details.description.strip():
            narrative = details.description.strip()
    elif db_case.description and db_case.description.strip():
        narrative = db_case.description.strip()

    # Aggregate complete case details text representation
    case_details_str = (
        f"- FIR Number: {db_case.fir_number}\n"
        f"- Police Station: {db_case.police_station}\n"
        f"- FIR Incident Date & Time: {str(db_case.incident_date)}\n"
        f"- Investigating Officer: {investigating_officer}\n"
        f"- Victim Details:\n{victim_str}\n"
        f"- Accused Details:\n{accused_str}\n"
        f"- Witnesses Recorded During Investigation:\n{witnesses_str}\n"
        f"- Evidence Items / Locker:\n{evidence_str}\n"
        f"- Incident Description / Narrative:\n{narrative}"
    )

    prompt = template.format(
        crime_category=crime_category,
        legal_sections=legal_sections_str,
        case_details=case_details_str,
        rag_context=rag_context
    )
    return prompt

def generate_and_save_document(db: Session, request, user_id: int) -> Document:
    """
    Generates a legal document utilizing case details, DOCX templates in temp_uploads/,
    and AI narrative generation, persists it in the database, and returns the Document model.
    """
    return create_document(db, request, user_id)

def create_document(
    db: Session,
    request,
    user_id: int
) -> Document:
    """
    Generates a legal document utilizing case details, DOCX templates in temp_uploads/,
    and AI narrative generation, persists it in the database, and returns the Document model.
    """
    # 1. Fetch case and details eagerly
    db_case = (
        db.query(Case)
        .options(
            joinedload(Case.details),
            selectinload(Case.witness_records),
            selectinload(Case.suspect_records),
            selectinload(Case.evidence),
        )
        .filter(Case.id == request.case_id)
        .first()
    )
    if not db_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {request.case_id} not found."
        )

    # 2. Fetch officer user details
    officer = db.query(User).filter(User.id == user_id).first()

    # 3. Generate Filled DOCX & PDF via template engine
    doc_res = generate_filled_docx_and_pdf(
        case=db_case,
        document_type=request.document_type.value,
        officer=officer
    )

    # 4. Serialize metadata & preview to generated_content JSON
    content_payload = json.dumps({
        "document_type": doc_res["document_type"],
        "template_name": doc_res["template_name"],
        "template_version": doc_res["template_version"],
        "docx_path": doc_res["docx_path"],
        "pdf_path": doc_res["pdf_path"],
        "generated_at": doc_res["generated_at"],
        "preview_text": doc_res["preview_text"],
        "regeneration_history": []
    }, indent=2)

    # 5. Save the document to the database
    db_document = Document(
        case_id=db_case.id,
        document_type=request.document_type.value,
        generated_content=content_payload,
        created_by=user_id
    )
    
    db.add(db_document)
    db.flush()

    # Log document generation in CaseTimeline
    from app.models.timeline import CaseTimeline
    event_names = {
        "seizure_memo": "Evidence Collected",
        "remand_application": "Remand Requested",
        "charge_sheet": "Charge Sheet Filed",
        "case_summary": "Case Status Updated"
    }
    event_name = event_names.get(request.document_type.value, "Document Generated")
    db_timeline = CaseTimeline(
        case_id=db_case.id,
        event_name=event_name,
        description=f"Legal document draft ({request.document_type.value.replace('_', ' ')}) generated using template '{doc_res['template_name']}'.",
        created_by=user_id
    )
    db.add(db_timeline)
    
    db.commit()
    db.refresh(db_document)
    
    return db_document

def regenerate_document(db: Session, document_id: int, user_id: int) -> Document:
    """
    Regenerates the content of an existing document using updated Case Details and DOCX template.
    """
    # 1. Fetch document
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )
        
    # 2. Fetch case eagerly
    db_case = (
        db.query(Case)
        .options(
            joinedload(Case.details),
            selectinload(Case.witness_records),
            selectinload(Case.suspect_records),
            selectinload(Case.evidence),
        )
        .filter(Case.id == db_doc.case_id)
        .first()
    )
    if not db_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case associated with Document {document_id} not found."
        )
        
    # 3. Fetch officer user details
    officer = db.query(User).filter(User.id == user_id).first()

    # 4. Parse previous history
    previous_history = []
    try:
        if db_doc.generated_content and db_doc.generated_content.startswith('{'):
            parsed_prev = json.loads(db_doc.generated_content)
            previous_history = parsed_prev.get("regeneration_history", [])
            previous_history.append({
                "generated_at": parsed_prev.get("generated_at"),
                "docx_path": parsed_prev.get("docx_path"),
                "pdf_path": parsed_prev.get("pdf_path")
            })
    except Exception:
        pass

    # 5. Re-run document generation pipeline
    doc_res = generate_filled_docx_and_pdf(
        case=db_case,
        document_type=db_doc.document_type,
        officer=officer
    )

    # 6. Serialize updated metadata & history
    content_payload = json.dumps({
        "document_type": doc_res["document_type"],
        "template_name": doc_res["template_name"],
        "template_version": doc_res["template_version"],
        "docx_path": doc_res["docx_path"],
        "pdf_path": doc_res["pdf_path"],
        "generated_at": doc_res["generated_at"],
        "preview_text": doc_res["preview_text"],
        "regeneration_history": previous_history
    }, indent=2)

    # 7. Update content and uploader
    db_doc.generated_content = content_payload
    db_doc.created_by = user_id
    db_doc.created_date = datetime.utcnow()
    
    # 8. Log in CaseTimeline
    from app.models.timeline import CaseTimeline
    db_timeline = CaseTimeline(
        case_id=db_case.id,
        event_name="Document Regenerated",
        description=f"Legal document ({db_doc.document_type.replace('_', ' ')}) was regenerated using template '{doc_res['template_name']}'.",
        created_by=user_id
    )
    db.add(db_timeline)
    
    db.commit()
    db.refresh(db_doc)
    return db_doc

def delete_document(db: Session, document_id: int, user_id: int, user_role: str = None) -> dict:
    """
    Deletes a generated document record from DB and cleans up DOCX/PDF files from storage.
    Only authorized users (ADMIN or creator/assigned officer) can delete documents.
    """
    import os
    import logging
    logger = logging.getLogger("crimegpt.services.document")

    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )

    # Authorization Check
    if user_role and user_role.upper() != "ADMIN" and db_doc.created_by and db_doc.created_by != user_id:
        if user_role.upper() not in ["POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to delete this document."
            )

    docx_path = None
    pdf_path = None

    if db_doc.generated_content and isinstance(db_doc.generated_content, str) and db_doc.generated_content.strip().startswith('{'):
        try:
            payload = json.loads(db_doc.generated_content)
            docx_path = payload.get("docx_path")
            pdf_path = payload.get("pdf_path")
        except Exception:
            pass

    for path in [docx_path, pdf_path]:
        if path and os.path.exists(path):
            try:
                os.remove(path)
                logger.info(f"Deleted storage file: {path}")
            except Exception as e:
                logger.warning(f"Failed removing document file {path}: {e}")

    doc_type = db_doc.document_type
    case_id = db_doc.case_id

    # Log in CaseTimeline
    from app.models.timeline import CaseTimeline
    db_timeline = CaseTimeline(
        case_id=case_id,
        event_name="Document Deleted",
        description=f"Generated document #{document_id} ({doc_type.replace('_', ' ')}) was deleted.",
        created_by=user_id
    )
    db.add(db_timeline)

    # Audit log
    from app.utils.audit_helper import log_audit
    user_name = "Officer"
    if user_id:
        u = db.query(User).filter(User.id == user_id).first()
        if u:
            user_name = u.name

    log_audit(
        db,
        user_id=user_id,
        user_name=user_name,
        action="Delete Document",
        details=f"Deleted document ID {document_id} ({doc_type}) from Case ID {case_id}"
    )

    db.delete(db_doc)
    db.commit()

    return {"message": f"Document ID {document_id} deleted successfully.", "id": document_id}
