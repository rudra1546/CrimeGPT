import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.case import CaseCreate, CaseUpdate, CaseResponse
from app.services import case_service
from app.routes.deps import RoleChecker, get_current_user
from app.models.user import User

# Secure all routes in this router to only allow ADMIN and POLICE_OFFICER roles
router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER"]))])

@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create(
    case_data: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registers a new case file and details.
    """
    return case_service.create_case(db, case_data, user_id=current_user.id)

@router.get("/", response_model=list[CaseResponse])
def get_all(db: Session = Depends(get_db)):
    """
    Retrieves all case records.
    """
    return case_service.get_all_cases(db)

@router.get("/{case_id}", response_model=CaseResponse)
def get_one(case_id: int, db: Session = Depends(get_db)):
    """
    Retrieves details of a single case by ID.
    """
    db_case = case_service.get_case_by_id(db, case_id)
    if not db_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )
    return db_case

@router.put("/{case_id}", response_model=CaseResponse)
def update(case_id: int, case_data: CaseUpdate, db: Session = Depends(get_db)):
    """
    Updates base case parameter fields and/or case details.
    """
    updated_case = case_service.update_case(db, case_id, case_data)
    if not updated_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )
    return updated_case

@router.delete("/{case_id}", status_code=status.HTTP_200_OK)
def delete(case_id: int, db: Session = Depends(get_db)):
    """
    Deletes a case file and all cascade items.
    """
    success = case_service.delete_case(db, case_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )
    return {"message": f"Case with ID {case_id} has been successfully deleted."}

import os
import shutil
from fastapi import File, UploadFile
from fastapi.responses import FileResponse
from app.models.evidence import Evidence
from app.schemas.evidence import EvidenceResponse

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploaded_evidence"
)

@router.post("/{case_id}/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
def upload_evidence(
    case_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a physical evidence file (PDF, Image, Document) linked to a Case.
    """
    case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )

    # Save to dynamic local path
    case_upload_dir = os.path.join(UPLOAD_DIR, str(case_id))
    os.makedirs(case_upload_dir, exist_ok=True)
    
    file_path = os.path.join(case_upload_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        db_evidence = Evidence(
            case_id=case_id,
            file_name=file.filename,
            file_type=file.content_type,
            file_path=os.path.relpath(file_path, UPLOAD_DIR),
            uploaded_by=current_user.id
        )
        db.add(db_evidence)
        db.flush()

        # Add CaseTimeline event
        from app.models.timeline import CaseTimeline
        db_timeline = CaseTimeline(
            case_id=case_id,
            event_name="Evidence Collected",
            description=f"Evidence file '{file.filename}' was uploaded to the locker.",
            created_by=current_user.id
        )
        db.add(db_timeline)

        db.commit()
        db.refresh(db_evidence)
        return db_evidence
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save evidence file: {str(e)}"
        )

@router.get("/{case_id}/evidence", response_model=list[EvidenceResponse])
def list_evidence(case_id: int, db: Session = Depends(get_db)):
    """
    List all evidence records linked to a Case.
    """
    case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )
    return db.query(Evidence).filter(Evidence.case_id == case_id).all()

@router.get("/{case_id}/evidence/{evidence_id}/download")
def download_evidence(case_id: int, evidence_id: int, db: Session = Depends(get_db)):
    """
    Download a physical evidence file securely under user role verification.
    """
    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id,
        Evidence.case_id == case_id
    ).first()
    
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence with ID {evidence_id} not found for Case {case_id}."
        )
    
    full_path = os.path.join(UPLOAD_DIR, evidence.file_path)
    if not os.path.exists(full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical file not found on disk."
        )
        
    return FileResponse(
        path=full_path,
        filename=evidence.file_name,
        media_type=evidence.file_type
    )

@router.delete("/{case_id}/evidence/{evidence_id}", status_code=status.HTTP_200_OK)
def delete_evidence(case_id: int, evidence_id: int, db: Session = Depends(get_db)):
    """
    Permanently delete an evidence file from disk and database records.
    """
    evidence = db.query(Evidence).filter(
        Evidence.id == evidence_id,
        Evidence.case_id == case_id
    ).first()
    
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence with ID {evidence_id} not found for Case {case_id}."
        )
        
    full_path = os.path.join(UPLOAD_DIR, evidence.file_path)
    try:
        if os.path.exists(full_path):
            os.remove(full_path)
        db.delete(evidence)
        db.commit()
        return {"message": f"Evidence file {evidence.file_name} successfully purged."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete evidence file: {str(e)}"
        )

from app.schemas.timeline import CaseTimelineCreate, CaseTimelineResponse
from app.models.timeline import CaseTimeline

@router.post("/{case_id}/timeline", response_model=CaseTimelineResponse, status_code=status.HTTP_201_CREATED)
def create_timeline_event(
    case_id: int,
    event_data: CaseTimelineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually log a case timeline event.
    """
    case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )
        
    db_event = CaseTimeline(
        case_id=case_id,
        event_name=event_data.event_name,
        description=event_data.description,
        created_by=current_user.id
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/{case_id}/timeline", response_model=list[CaseTimelineResponse])
def get_timeline(case_id: int, db: Session = Depends(get_db)):
    """
    Retrieve all timeline events linked to a case.
    """
    case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )
    return db.query(CaseTimeline).filter(CaseTimeline.case_id == case_id).order_by(CaseTimeline.timestamp.asc()).all()

@router.get("/{case_id}/analysis")
def analyze_case(case_id: int, db: Session = Depends(get_db)):
    """
    Audits the current case files and details using Gemini to identify missing fields,
    witness/evidence gaps, and suggest relevant legal sections (IPC/BNS).
    """
    case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )

    details = case.details
    
    # Helper to parse text columns back to readable format if they are JSON
    def get_readable_details(val):
        if not val:
            return "None"
        try:
            parsed = json.loads(val)
            return json.dumps(parsed, indent=2)
        except Exception:
            return str(val)

    prompt = (
        "You are CrimeGPT, an expert criminal investigator and legal audit AI assistant.\n"
        "You are auditing the following case dossier for completeness, legal sections, timeline inconsistencies, and investigation gaps.\n\n"
        f"--- CASE PROFILE ---\n"
        f"FIR Number: {case.fir_number}\n"
        f"Police Station: {case.police_station}\n"
        f"Crime Category: {case.crime_type}\n"
        f"Date of Incident: {case.incident_date}\n"
        f"Investigation Status: {case.status}\n"
        f"Investigating Officer: {get_readable_details(details.investigating_officer) if details else 'None'}\n"
        f"Victim Details: {get_readable_details(details.victim_details) if details else 'None'}\n"
        f"Accused Details: {get_readable_details(details.accused_details) if details else 'None'}\n"
        f"Witnesses: {get_readable_details(details.witnesses) if details else 'None'}\n"
        f"Evidence Details: {get_readable_details(details.evidence_details) if details else 'None'}\n"
        f"Incident Narrative: {details.incident_description if details else 'None'}\n"
        f"Applicable Sections: {details.ipc_sections if details else 'None'}\n"
        f"Physical Evidence Files Uploaded: {', '.join([ev.file_name for ev in case.evidence]) if case.evidence else 'None'}\n"
        "--- END CASE PROFILE ---\n\n"
        "Audit the case dossier and identify:\n"
        "1. Missing victim details (e.g., name, age, contact number, father/mother name)\n"
        "2. Missing accused details (e.g., age, aliases, address)\n"
        "3. Missing witness information (e.g., statements, phone numbers, addresses)\n"
        "4. Missing evidence details (e.g., recovery date, recovered location, officer remarks)\n"
        "5. Missing legal sections (any applicable sections of IPC or BNS matching the narrative)\n"
        "6. Inconsistencies or logical gaps in the timeline of events (e.g., arrest before recovery, missing dates)\n"
        "7. Investigation gaps (e.g., weapon not recovered, CCTV not secured)\n\n"
        "Generate concrete, short warning recommendations (prefixed with ⚠) like:\n"
        "- ⚠ Missing witness phone number\n"
        "- ⚠ Recovery location missing\n"
        "- ⚠ No seizure date recorded\n\n"
        "Provide your analysis in a valid JSON format with the following keys:\n"
        "{\n"
        '  "recommendations": ["list of warning string items starting with ⚠"],\n'
        '  "suggested_sections": "A string recommending applicable IPC/BNS sections based on facts",\n'
        '  "suggested_steps": ["list of recommended next investigation steps"],\n'
        '  "detailed_analysis": "A detailed Markdown report explaining the timeline inconsistencies, gaps, and legal reasoning"\n'
        "}\n\n"
        "Return ONLY the JSON string. Do not include markdown code block formatting (like ```json ... ```)."
    )

    try:
        from app.ai.gemini import generate_document
        raw_text = generate_document(prompt)
        clean_text = raw_text.strip()
        if clean_text.startswith("```"):
            first_line_end = clean_text.find("\n")
            if first_line_end != -1:
                clean_text = clean_text[first_line_end:].strip()
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3].strip()
        
        parsed = json.loads(clean_text)
        return parsed
    except Exception as e:
        logger.error(f"Failed to generate case analysis: {e}")
        # Return fallback structured object if JSON load fails
        raw_output = raw_text if 'raw_text' in locals() else str(e)
        return {
            "recommendations": ["⚠ Case analysis generated in unstructured format"],
            "suggested_sections": "Refer to detailed analysis report.",
            "suggested_steps": ["Review full report"],
            "detailed_analysis": raw_output
        }


