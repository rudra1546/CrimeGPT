import json
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.case import Case
from app.models.document import Document
from app.schemas.document import DocumentGenerateRequest
from app.ai.prompts import get_prompt_template
from app.ai.gemini import generate_document

def format_json_field_for_prompt(field_name: str, raw_val: str | None) -> str:
    if not raw_val:
        return "[Information Required]"
    try:
        parsed = json.loads(raw_val)
    except Exception:
        return str(raw_val)
    
    if field_name == "victim_details":
        if not isinstance(parsed, dict):
            return str(raw_val)
        items = []
        for k, v in parsed.items():
            if v:
                items.append(f"  - {k.replace('_', ' ').title()}: {v}")
        return "\n".join(items) if items else "[Information Required]"
        
    elif field_name == "accused_details":
        if not isinstance(parsed, dict):
            return str(raw_val)
        items = []
        for k, v in parsed.items():
            if v:
                items.append(f"  - {k.replace('_', ' ').title()}: {v}")
        return "\n".join(items) if items else "[Information Required]"
        
    elif field_name == "witnesses":
        if not isinstance(parsed, list):
            return str(raw_val)
        witness_blocks = []
        for idx, w in enumerate(parsed):
            w_details = []
            for k, v in w.items():
                if v:
                    w_details.append(f"    * {k.replace('_', ' ').title()}: {v}")
            if w_details:
                witness_blocks.append(f"  Witness #{idx+1}:\n" + "\n".join(w_details))
        return "\n\n".join(witness_blocks) if witness_blocks else "[Information Required]"
        
    elif field_name == "evidence_details":
        if not isinstance(parsed, list):
            return str(raw_val)
        evidence_blocks = []
        for idx, ev in enumerate(parsed):
            ev_details = []
            for k, v in ev.items():
                if v:
                    ev_details.append(f"    * {k.replace('_', ' ').title()}: {v}")
            if ev_details:
                evidence_blocks.append(f"  Evidence Item #{idx+1}:\n" + "\n".join(ev_details))
        return "\n\n".join(evidence_blocks) if evidence_blocks else "[Information Required]"

    return str(raw_val)

def build_prompt(db_case: Case, template: str) -> str:
    details = db_case.details
    
    # Retrieve RAG context
    from app.rag.retriever import retrieve_context
    rag_query = f"{db_case.crime_type} {details.ipc_sections if details else ''}"
    try:
        rag_context = retrieve_context(rag_query, k=3)
    except Exception:
        rag_context = ""
    if not rag_context:
        rag_context = "No custom indexed legal manual references found in ChromaDB."

    investigating_officer = "[Information Required]"
    if details and details.investigating_officer:
        investigating_officer = details.investigating_officer

    victim_str = format_json_field_for_prompt("victim_details", details.victim_details if details else None)
    accused_str = format_json_field_for_prompt("accused_details", details.accused_details if details else None)
    witnesses_str = format_json_field_for_prompt("witnesses", details.witnesses if details else None)
    evidence_str = format_json_field_for_prompt("evidence_details", details.evidence_details if details else None)

    prompt = template.format(
        fir_number=db_case.fir_number,
        police_station=db_case.police_station,
        crime_type=db_case.crime_type,
        incident_date=str(db_case.incident_date),
        investigating_officer=investigating_officer,
        victim_details=victim_str,
        accused_details=accused_str,
        witnesses=witnesses_str,
        evidence_details=evidence_str,
        incident_description=details.incident_description if details and details.incident_description else "[Information Required]",
        ipc_sections=details.ipc_sections if details and details.ipc_sections else "[Information Required]",
        rag_context=rag_context
    )
    return prompt

def generate_and_save_document(db: Session, request: DocumentGenerateRequest, user_id: int) -> Document:
    """
    Generates a legal document utilizing case details, similarity-retrieved RAG legal fragments,
    and the Gemini API, persists it in the database, and returns the Document model.
    """
    # 1. Fetch case and details
    db_case = db.query(Case).filter(Case.id == request.case_id).first()
    if not db_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {request.case_id} not found."
        )

    # 2. Fetch prompt template
    try:
        template = get_prompt_template(request.document_type.value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # 3. Interpolate prompt template with case details and RAG context
    prompt = build_prompt(db_case, template)

    # 4. Call Gemini API to generate the document content
    try:
        generated_text = generate_document(prompt)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {str(e)}"
        )

    # 5. Save the document to the database
    db_document = Document(
        case_id=db_case.id,
        document_type=request.document_type.value,
        generated_content=generated_text,
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
        description=f"AI drafted legal document ({request.document_type.value.replace('_', ' ')}) was registered.",
        created_by=user_id
    )
    db.add(db_timeline)
    
    db.commit()
    db.refresh(db_document)
    
    return db_document

from datetime import datetime

def regenerate_document(db: Session, document_id: int, user_id: int) -> Document:
    """
    Regenerates the content of an existing document using update Case Details and Gemini.
    """
    # 1. Fetch document
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )
        
    # 2. Fetch case
    db_case = db.query(Case).filter(Case.id == db_doc.case_id).first()
    if not db_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case associated with Document {document_id} not found."
        )
        
    # 3. Interpolate prompt template
    try:
        template = get_prompt_template(db_doc.document_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    prompt = build_prompt(db_case, template)

    # 4. Generate new content
    try:
        generated_text = generate_document(prompt)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI regeneration failed: {str(e)}"
        )
        
    # 5. Update content and uploader
    db_doc.generated_content = generated_text
    db_doc.created_by = user_id
    db_doc.created_date = datetime.utcnow()
    
    # 6. Log in CaseTimeline
    from app.models.timeline import CaseTimeline
    db_timeline = CaseTimeline(
        case_id=db_case.id,
        event_name="Document Regenerated",
        description=f"AI drafted legal document ({db_doc.document_type.replace('_', ' ')}) was regenerated.",
        created_by=user_id
    )
    db.add(db_timeline)
    
    db.commit()
    db.refresh(db_doc)
    return db_doc
