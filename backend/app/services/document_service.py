from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.case import Case
from app.models.document import Document
from app.schemas.document import DocumentGenerateRequest
from app.ai.prompts import get_prompt_template
from app.ai.gemini import generate_document

def generate_and_save_document(db: Session, request: DocumentGenerateRequest, user_id: int) -> Document:
    """
    Generates a legal document utilizing case details and the Gemini API, 
    persists it in the database, and returns the Document model.
    """
    # 1. Fetch case and details
    db_case = db.query(Case).filter(Case.id == request.case_id).first()
    if not db_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {request.case_id} not found."
        )

    # 2. Extract values with fallbacks if details is not initialized
    details = db_case.details
    
    # 3. Fetch prompt template
    try:
        template = get_prompt_template(request.document_type.value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # 4. Interpolate prompt template with case details
    prompt = template.format(
        fir_number=db_case.fir_number,
        police_station=db_case.police_station,
        crime_type=db_case.crime_type,
        incident_date=str(db_case.incident_date),
        victim_details=details.victim_details if details and details.victim_details else "[MISSING: Victim Details]",
        accused_details=details.accused_details if details and details.accused_details else "[MISSING: Accused Details]",
        incident_description=details.incident_description if details and details.incident_description else "[MISSING: Incident Description]",
        ipc_sections=details.ipc_sections if details and details.ipc_sections else "[MISSING: Applicable IPC Sections]",
        evidence_details=details.evidence_details if details and details.evidence_details else "[MISSING: Evidence DetailsRecovery Details]"
    )

    # 5. Call Gemini API to generate the document content
    try:
        generated_text = generate_document(prompt)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {str(e)}"
        )

    # 6. Save the document to the database
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
        "charge_sheet": "Charge Sheet Filed"
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
    details = db_case.details
    try:
        template = get_prompt_template(db_doc.document_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
        
    prompt = template.format(
        fir_number=db_case.fir_number,
        police_station=db_case.police_station,
        crime_type=db_case.crime_type,
        incident_date=str(db_case.incident_date),
        victim_details=details.victim_details if details and details.victim_details else "[MISSING: Victim Details]",
        accused_details=details.accused_details if details and details.accused_details else "[MISSING: Accused Details]",
        incident_description=details.incident_description if details and details.incident_description else "[MISSING: Incident Description]",
        ipc_sections=details.ipc_sections if details and details.ipc_sections else "[MISSING: Applicable IPC Sections]",
        evidence_details=details.evidence_details if details and details.evidence_details else "[MISSING: Evidence DetailsRecovery Details]"
    )

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


