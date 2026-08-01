import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.case import CaseCreate, CaseUpdate, CaseResponse
from app.services import case_service
from app.routes.deps import RoleChecker, get_current_user
from app.models.user import User
from app.utils.audit_helper import log_audit
from app.models.evidence_movement import EvidenceMovement
from app.schemas.evidence import EvidenceMovementCreate, EvidenceMovementResponse

# Secure all routes in this router to only allow ADMIN and POLICE_OFFICER roles
router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]))])

@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create(
    case_data: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["POLICE_OFFICER"]))
):
    """
    Registers a new case file and details.
    """
    res = case_service.create_case(db, case_data, user_id=current_user.id)
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Create Case",
        details=f"Registered Case FIR No. {res.fir_number} at Police Station {res.police_station}"
    )

    # Build validated response — do NOT assign arbitrary attrs to ORM object
    from app.models.audit_log import AuditLog
    audit_logs = db.query(AuditLog).filter(AuditLog.details.like(f"%{res.fir_number}%")).all()
    response = CaseResponse.model_validate(res)
    response.audit_logs = audit_logs
    return response

@router.get("/", response_model=list[CaseResponse])
def get_all(db: Session = Depends(get_db)):
    """
    Retrieves all case records.
    """
    return case_service.get_all_cases(db)

@router.get("/{case_id}", response_model=CaseResponse)
def get_one(case_id: int, db: Session = Depends(get_db)):
    """
    Retrieves details of a single case by ID with nested modules.
    """
    db_case = case_service.get_case_by_id(db, case_id)
    if not db_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )

    # Build validated response — do NOT assign arbitrary attrs to ORM object
    from app.models.audit_log import AuditLog
    audit_logs = db.query(AuditLog).filter(AuditLog.details.like(f"%{db_case.fir_number}%")).all()
    response = CaseResponse.model_validate(db_case)
    response.audit_logs = audit_logs
    return response

@router.put("/{case_id}", response_model=CaseResponse)
def update(
    case_id: int,
    case_data: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates base case parameter fields and/or case details.
    """
    db_case_before = case_service.get_case_by_id(db, case_id)
    prev_legal_sections = db_case_before.details.legal_sections if (db_case_before and db_case_before.details) else None

    updated_case = case_service.update_case(db, case_id, case_data)
    if not updated_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )
    
    if case_data.details is not None and case_data.details.legal_sections is not None:
        new_legal_sections = case_service.serialize_field(case_data.details.legal_sections)
        if prev_legal_sections != new_legal_sections:
            log_audit(
                db,
                user_id=current_user.id,
                user_name=current_user.name,
                action="LEGAL_SECTION_UPDATED",
                details=f"Case FIR No. {updated_case.fir_number} | Previous: {prev_legal_sections or 'None'} | Updated: {new_legal_sections or 'None'}"
            )

    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Update Case",
        details=f"Updated Case FIR No. {updated_case.fir_number}"
    )
    return updated_case

@router.delete("/{case_id}", status_code=status.HTTP_200_OK)
def delete(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a case file and all cascade items.
    """
    case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )
    fir_number = case.fir_number
    success = case_service.delete_case(db, case_id)
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Delete Case",
        details=f"Purged Case FIR No. {fir_number}"
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

@router.get("/search/global")
def global_search(query: str, db: Session = Depends(get_db)):
    """
    Search cases by FIR, suspect name, victim name, witness name, officer name, or evidence ID.
    """
    from app.models.case import Case
    from app.models.case_details import CaseDetails
    from app.models.witness import Witness
    from app.models.suspect import Suspect
    from app.models.evidence import Evidence
    
    query_lower = f"%{query.lower()}%"
    
    # 1. Search in Case (FIR number, Police station, Crime type)
    cases_match = db.query(Case).filter(
        (Case.fir_number.ilike(query_lower)) |
        (Case.police_station.ilike(query_lower)) |
        (Case.crime_type.ilike(query_lower))
    ).all()
    
    matched_ids = {c.id for c in cases_match}
    
    # 2. Search in CaseDetails (victim_details, investigating_officer)
    details_match = db.query(CaseDetails).filter(
        (CaseDetails.victim_details.ilike(query_lower)) |
        (CaseDetails.investigating_officer.ilike(query_lower))
    ).all()
    for d in details_match:
        matched_ids.add(d.case_id)
        
    # 3. Search in Witnesses
    witness_match = db.query(Witness).filter(
        (Witness.name.ilike(query_lower)) |
        (Witness.phone.ilike(query_lower))
    ).all()
    for w in witness_match:
        matched_ids.add(w.case_id)
        
    # 4. Search in Suspects
    suspect_match = db.query(Suspect).filter(
        (Suspect.name.ilike(query_lower)) |
        (Suspect.alias.ilike(query_lower))
    ).all()
    for s in suspect_match:
        matched_ids.add(s.case_id)
        
    # 5. Search in Evidence
    evidence_match = db.query(Evidence).filter(
        (Evidence.file_name.ilike(query_lower)) |
        (Evidence.description.ilike(query_lower)) |
        (Evidence.collecting_officer.ilike(query_lower))
    ).all()
    for ev in evidence_match:
        matched_ids.add(ev.case_id)
        
    # Retrieve all matched Case objects
    results = db.query(Case).filter(Case.id.in_(list(matched_ids))).all() if matched_ids else []
    return results

@router.post("/evidence/{evidence_id}/movement", response_model=EvidenceMovementResponse, status_code=status.HTTP_201_CREATED)
def record_evidence_movement(
    evidence_id: int,
    movement_data: EvidenceMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.evidence import Evidence
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence record with ID {evidence_id} not found."
        )
        
    db_movement = EvidenceMovement(
        evidence_id=evidence_id,
        **movement_data.model_dump()
    )
    db.add(db_movement)
    db.commit()
    db.refresh(db_movement)
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Transfer Evidence",
        details=f"Transferred evidence ID {evidence_id} ({evidence.file_name}) from {db_movement.from_officer} (Badge: {db_movement.from_officer_badge}) to {db_movement.to_officer} (Badge: {db_movement.to_officer_badge}). Reason: {db_movement.transfer_reason}"
    )
    
    return db_movement

@router.get("/evidence/{evidence_id}/movement", response_model=list[EvidenceMovementResponse])
def get_evidence_movement_history(evidence_id: int, db: Session = Depends(get_db)):
    return db.query(EvidenceMovement).filter(EvidenceMovement.evidence_id == evidence_id).order_by(EvidenceMovement.timestamp.asc()).all()

from pydantic import BaseModel
from sqlalchemy import func

class ShoReviewRequest(BaseModel):
    action: str  # "approve" | "request_revision"
    remarks: str | None = None

class AssignOfficerRequest(BaseModel):
    investigating_officer: str


@router.post("/{case_id}/submit-for-review", response_model=CaseResponse)
def submit_for_review(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits a case dossier for supervisory SHO review.
    """
    from app.models.case import Case
    from app.models.timeline import CaseTimeline

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    if case.status == "closed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot submit a closed case for review.")

    case.status = "pending_sho_review"

    tl = CaseTimeline(
        case_id=case_id,
        event_name="Submitted for SHO Review",
        description=f"Case FIR No. {case.fir_number} submitted for supervisory review by {current_user.name} ({current_user.role}).",
        created_by=current_user.id
    )
    db.add(tl)

    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Submit Case for SHO Review",
        details=f"Submitted Case FIR No. {case.fir_number} for SHO review"
    )

    db.commit()
    db.refresh(case)
    return case_service.get_case_by_id(db, case_id)

@router.post("/{case_id}/sho-review", response_model=CaseResponse)
def sho_review(
    case_id: int,
    req: ShoReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Performs supervisory review on a case. Restricted strictly to SHO role.
    """
    if current_user.role != "SHO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Station House Officers (SHO) can perform case reviews.")

    from app.models.case import Case
    from app.models.timeline import CaseTimeline

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    action_type = req.action.lower().strip()
    remarks_str = f" | Remarks: {req.remarks}" if req.remarks else ""

    if action_type == "approve":
        case.status = "closed"
        event_title = "Case Approved & Closed by SHO"
        desc = f"SHO {current_user.name} approved the investigation and officially closed Case FIR No. {case.fir_number}{remarks_str}."
    elif action_type in ["request_revision", "reject"]:
        case.status = "revision_requested"
        event_title = "SHO Requested Revisions"
        desc = f"SHO {current_user.name} requested revisions for Case FIR No. {case.fir_number}{remarks_str}."
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid review action. Use 'approve' or 'request_revision'.")

    tl = CaseTimeline(
        case_id=case_id,
        event_name=event_title,
        description=desc,
        created_by=current_user.id
    )
    db.add(tl)

    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action=f"SHO Review ({action_type})",
        details=f"SHO review decision '{action_type}' recorded for Case FIR No. {case.fir_number}{remarks_str}"
    )

    db.commit()
    db.refresh(case)
    return case_service.get_case_by_id(db, case_id)

@router.post("/{case_id}/assign", response_model=CaseResponse)
def assign_investigating_officer(
    case_id: int,
    req: AssignOfficerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assigns or reassigns an investigating officer to a case file. Restricted strictly to SHO role.
    """
    if current_user.role != "SHO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Station House Officers (SHO) can assign or reassign cases.")

    from app.models.case import Case
    from app.models.case_details import CaseDetails
    from app.models.timeline import CaseTimeline

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    details = db.query(CaseDetails).filter(CaseDetails.case_id == case_id).first()
    if not details:
        details = CaseDetails(case_id=case_id, investigating_officer=req.investigating_officer)
        db.add(details)
    else:
        details.investigating_officer = req.investigating_officer

    tl = CaseTimeline(
        case_id=case_id,
        event_name="Investigating Officer Assigned",
        description=f"SHO {current_user.name} assigned Officer '{req.investigating_officer}' to Case FIR No. {case.fir_number}.",
        created_by=current_user.id
    )
    db.add(tl)

    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Assign Case Officer",
        details=f"Assigned Case FIR No. {case.fir_number} to Officer {req.investigating_officer}"
    )

    db.commit()
    db.refresh(case)
    return case_service.get_case_by_id(db, case_id)

@router.get("/sho/pending-reviews", response_model=list[CaseResponse])
def get_pending_sho_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves all cases awaiting SHO supervisory approval. Restricted strictly to SHO role.
    """
    if current_user.role != "SHO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Station House Officers (SHO) can view pending reviews.")

    from app.models.case import Case
    return db.query(Case).filter(Case.status == "pending_sho_review").all()

@router.get("/sho/officers")
def get_station_officers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves list of active police officers for case assignment. Restricted strictly to SHO role.
    """
    if current_user.role != "SHO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Station House Officers (SHO) can view officer directory.")

    officers = db.query(User).filter(User.role.in_(["POLICE_OFFICER", "SHO"]), User.status == "ACTIVE").all()
    return [
        {
            "id": u.id,
            "name": u.name, 
            "email": u.email, 
            "role": u.role, 
            # "station": u.station
        } 
        for u in officers
        ]

@router.get("/sho/analytics")
def get_sho_station_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves comprehensive station statistics and officer workload metrics. Restricted strictly to SHO role.
    """
    if current_user.role != "SHO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Station House Officers (SHO) can view station analytics.")

    from app.models.case import Case
    from app.models.case_details import CaseDetails

    total_cases = db.query(Case).count()
    active_cases = db.query(Case).filter(Case.status == "active").count()
    pending_reviews = db.query(Case).filter(Case.status == "pending_sho_review").count()
    revision_requested = db.query(Case).filter(Case.status == "revision_requested").count()
    closed_cases = db.query(Case).filter(Case.status == "closed").count()

    # Officer Workload Breakdown
    workload_counts = (
        db.query(CaseDetails.investigating_officer, func.count(Case.id))
        .join(Case, Case.id == CaseDetails.case_id)
        .group_by(CaseDetails.investigating_officer)
        .all()
    )

    workload = [
        {"officer_name": officer or "Unassigned", "case_count": count}
        for officer, count in workload_counts
    ]

    # Category breakdown
    category_counts = db.query(Case.crime_type, func.count(Case.id)).group_by(Case.crime_type).all()
    case_distribution = [{"name": cat or "Unknown", "value": cnt} for cat, cnt in category_counts]

    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "pending_reviews": pending_reviews,
        "revision_requested": revision_requested,
        "closed_cases": closed_cases,
        "workload": workload,
        "case_distribution": case_distribution
    }

@router.post("/{case_id}/close", response_model=CaseResponse)
def close_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "SHO"]))
):
    """
    Closes an active case file. Allowed for ADMIN and SHO roles.
    """
    from datetime import datetime
    from app.models.case import Case
    from app.models.timeline import CaseTimeline

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    case.status = "closed"
    if hasattr(case, "closed_by"):
        case.closed_by = current_user.id
    if hasattr(case, "closed_at"):
        case.closed_at = datetime.utcnow()

    role_title = "Admin" if current_user.role == "ADMIN" else "SHO"
    tl = CaseTimeline(
        case_id=case_id,
        event_name="Case Closed",
        description=f"Case closed by {role_title} {current_user.name}.",
        created_by=current_user.id
    )
    db.add(tl)

    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Close Case",
        details=f"Closed Case FIR No. {case.fir_number}"
    )

    db.commit()
    db.refresh(case)
    return case_service.get_case_by_id(db, case_id)


@router.post("/{case_id}/reopen", response_model=CaseResponse)
def reopen_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """
    Reopens a closed case file. Restricted strictly to ADMIN role.
    """
    from datetime import datetime
    from app.models.case import Case
    from app.models.timeline import CaseTimeline

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    case.status = "active"
    if hasattr(case, "reopened_by"):
        case.reopened_by = current_user.id
    if hasattr(case, "reopened_at"):
        case.reopened_at = datetime.utcnow()

    tl = CaseTimeline(
        case_id=case_id,
        event_name="Case Reopened",
        description=f"Case reopened by Admin {current_user.name}.",
        created_by=current_user.id
    )
    db.add(tl)

    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Reopen Case",
        details=f"Reopened Case FIR No. {case.fir_number}"
    )

    db.commit()
    db.refresh(case)
    return case_service.get_case_by_id(db, case_id)



