from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.witness import Witness
from app.models.case import Case
from app.schemas.witness import WitnessCreate, WitnessUpdate, WitnessResponse
from app.routes.deps import RoleChecker, get_current_user
from app.models.user import User
from app.utils.audit_helper import log_audit

router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]))])

@router.post("/", response_model=WitnessResponse, status_code=status.HTTP_201_CREATED)
def create_witness(
    witness_data: WitnessCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify case exists
    case = db.query(Case).filter(Case.id == witness_data.case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {witness_data.case_id} not found."
        )
        
    db_witness = Witness(**witness_data.model_dump())
    db.add(db_witness)
    
    # Add CaseTimeline event
    from app.models.timeline import CaseTimeline
    db_timeline = CaseTimeline(
        case_id=witness_data.case_id,
        event_name="Witness Added",
        description=f"Witness '{db_witness.name}' details were recorded in the registry.",
        created_by=current_user.id
    )
    db.add(db_timeline)
    
    db.commit()
    db.refresh(db_witness)
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Add Witness",
        details=f"Added witness '{db_witness.name}' (Status: {db_witness.status}) to Case FIR No. {case.fir_number}"
    )
    
    return db_witness

@router.get("/case/{case_id}", response_model=list[WitnessResponse])
def get_case_witnesses(case_id: int, db: Session = Depends(get_db)):
    return db.query(Witness).filter(Witness.case_id == case_id).all()

@router.put("/{witness_id}", response_model=WitnessResponse)
def update_witness(
    witness_id: int,
    witness_data: WitnessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    witness = db.query(Witness).filter(Witness.id == witness_id).first()
    if not witness:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Witness with ID {witness_id} not found."
        )
        
    case = db.query(Case).filter(Case.id == witness.case_id).first()
    fir_no = case.fir_number if case else "N/A"
    
    update_dict = witness_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(witness, key, value)
        
    db.commit()
    db.refresh(witness)
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Update Witness",
        details=f"Updated witness '{witness.name}' details on Case FIR No. {fir_no}"
    )
    
    return witness

@router.delete("/{witness_id}", status_code=status.HTTP_200_OK)
def delete_witness(
    witness_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    witness = db.query(Witness).filter(Witness.id == witness_id).first()
    if not witness:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Witness with ID {witness_id} not found."
        )
        
    case = db.query(Case).filter(Case.id == witness.case_id).first()
    fir_no = case.fir_number if case else "N/A"
    name = witness.name
    
    db.delete(witness)
    db.commit()
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Delete Witness",
        details=f"Deleted witness '{name}' from Case FIR No. {fir_no}"
    )
    
    return {"message": f"Witness '{name}' deleted successfully."}
