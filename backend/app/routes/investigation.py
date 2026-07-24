from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.case import Case
from app.models.investigation import InvestigationRecord
from app.schemas.investigation import InvestigationRecordBase, InvestigationRecordResponse
from app.routes.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/investigation", tags=["investigation"])

@router.get("/case/{case_id}", response_model=InvestigationRecordResponse)
def get_investigation_record(case_id: int, db: Session = Depends(get_db)):
    """
    Retrieve InvestigationRecord details (Medical, Court/Remand, Panchanama, TIP) for a case.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    record = db.query(InvestigationRecord).filter(InvestigationRecord.case_id == case_id).first()
    if not record:
        # Auto-create empty record if it doesn't exist yet
        record = InvestigationRecord(case_id=case_id)
        db.add(record)
        db.commit()
        db.refresh(record)

    return record

@router.put("/case/{case_id}", response_model=InvestigationRecordResponse)
def update_investigation_record(
    case_id: int,
    payload: InvestigationRecordBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update InvestigationRecord details for a case.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    record = db.query(InvestigationRecord).filter(InvestigationRecord.case_id == case_id).first()
    if not record:
        record = InvestigationRecord(case_id=case_id)
        db.add(record)

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record
