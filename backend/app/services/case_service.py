from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.case import Case
from app.models.case_details import CaseDetails
from app.schemas.case import CaseCreate, CaseUpdate

def create_case(db: Session, case_data: CaseCreate, user_id: int) -> Case:
    """
    Creates a new case with associated case details.
    Raises HTTPException if FIR number already exists.
    """
    # Check for duplicate FIR number
    existing_case = db.query(Case).filter(Case.fir_number == case_data.fir_number).first()
    if existing_case:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A case with FIR number '{case_data.fir_number}' already exists."
        )

    # Create base Case model
    db_case = Case(
        fir_number=case_data.fir_number,
        police_station=case_data.police_station,
        crime_type=case_data.crime_type,
        incident_date=case_data.incident_date,
        status=case_data.status,
        created_by=user_id
    )
    db.add(db_case)
    db.flush()  # obtain db_case.id for ForeignKey link

    # Create CaseDetails model
    details_data = case_data.details
    db_details = CaseDetails(
        case_id=db_case.id,
        victim_details=details_data.victim_details if details_data else None,
        accused_details=details_data.accused_details if details_data else None,
        incident_description=details_data.incident_description if details_data else None,
        ipc_sections=details_data.ipc_sections if details_data else None,
        evidence_details=details_data.evidence_details if details_data else None
    )
    db.add(db_details)
    db.flush()

    # Add CaseTimeline event
    from app.models.timeline import CaseTimeline
    db_timeline = CaseTimeline(
        case_id=db_case.id,
        event_name="FIR Registered",
        description=f"FIR registered for Case FIR No. {db_case.fir_number} at Police Station {db_case.police_station}.",
        created_by=user_id
    )
    db.add(db_timeline)
    
    db.commit()
    db.refresh(db_case)
    return db_case


def get_all_cases(db: Session) -> list[Case]:
    """
    Fetches all cases in the database.
    """
    return db.query(Case).all()

def get_case_by_id(db: Session, case_id: int) -> Case | None:
    """
    Fetches a single case by its ID.
    """
    return db.query(Case).filter(Case.id == case_id).first()

def update_case(db: Session, case_id: int, case_data: CaseUpdate) -> Case | None:
    """
    Updates base case parameters and/or associated case details.
    Returns the updated Case, or None if the case does not exist.
    """
    db_case = get_case_by_id(db, case_id)
    if not db_case:
        return None

    # Update base Case attributes if specified
    case_update_dict = case_data.model_dump(exclude_unset=True, exclude={"details"})
    for key, value in case_update_dict.items():
        setattr(db_case, key, value)

    # Update associated CaseDetails if specified
    if case_data.details is not None:
        # Guarantee details object exists (in case it wasn't created initially)
        if not db_case.details:
            db_case.details = CaseDetails(case_id=db_case.id)
            db.add(db_case.details)
            db.flush()

        details_update_dict = case_data.details.model_dump(exclude_unset=True)
        for key, value in details_update_dict.items():
            setattr(db_case.details, key, value)

    db.commit()
    db.refresh(db_case)
    return db_case

def delete_case(db: Session, case_id: int) -> bool:
    """
    Deletes a case from the database. CaseDetails and Documents are cascade deleted.
    Returns True if successfully deleted, False if case not found.
    """
    db_case = get_case_by_id(db, case_id)
    if not db_case:
        return False

    db.delete(db_case)
    db.commit()
    return True
