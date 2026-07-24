from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.suspect import Suspect
from app.models.case import Case
from app.schemas.suspect import SuspectCreate, SuspectUpdate, SuspectResponse
from app.routes.deps import RoleChecker, get_current_user
from app.models.user import User
from app.utils.audit_helper import log_audit

router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]))])

@router.post("/", response_model=SuspectResponse, status_code=status.HTTP_201_CREATED)
def create_suspect(
    suspect_data: SuspectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == suspect_data.case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {suspect_data.case_id} not found."
        )
        
    db_suspect = Suspect(**suspect_data.model_dump())
    db.add(db_suspect)
    
    # Add CaseTimeline event
    from app.models.timeline import CaseTimeline
    db_timeline = CaseTimeline(
        case_id=suspect_data.case_id,
        event_name="Suspect Registered",
        description=f"Suspect '{db_suspect.name}' details were recorded in the dossier.",
        created_by=current_user.id
    )
    db.add(db_timeline)
    
    db.commit()
    db.refresh(db_suspect)
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Add Suspect",
        details=f"Added suspect '{db_suspect.name}' (Alias: {db_suspect.alias}, Status: {db_suspect.status}) to Case FIR No. {case.fir_number}"
    )
    
    return db_suspect

@router.get("/case/{case_id}", response_model=list[SuspectResponse])
def get_case_suspects(case_id: int, db: Session = Depends(get_db)):
    return db.query(Suspect).filter(Suspect.case_id == case_id).all()

@router.put("/{suspect_id}", response_model=SuspectResponse)
def update_suspect(
    suspect_id: int,
    suspect_data: SuspectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    suspect = db.query(Suspect).filter(Suspect.id == suspect_id).first()
    if not suspect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Suspect with ID {suspect_id} not found."
        )
        
    case = db.query(Case).filter(Case.id == suspect.case_id).first()
    fir_no = case.fir_number if case else "N/A"
    
    update_dict = suspect_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(suspect, key, value)
        
    db.commit()
    db.refresh(suspect)
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Update Suspect",
        details=f"Updated suspect '{suspect.name}' details on Case FIR No. {fir_no}"
    )
    
    return suspect

@router.delete("/{suspect_id}", status_code=status.HTTP_200_OK)
def delete_suspect(
    suspect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    suspect = db.query(Suspect).filter(Suspect.id == suspect_id).first()
    if not suspect:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Suspect with ID {suspect_id} not found."
        )
        
    case = db.query(Case).filter(Case.id == suspect.case_id).first()
    fir_no = case.fir_number if case else "N/A"
    name = suspect.name
    
    db.delete(suspect)
    db.commit()
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Delete Suspect",
        details=f"Deleted suspect '{name}' from Case FIR No. {fir_no}"
    )
    
    return {"message": f"Suspect '{name}' deleted successfully."}
