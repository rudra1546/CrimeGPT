from pydantic import BaseModel
from typing import Optional

class InvestigationRecordBase(BaseModel):
    # Medical Records
    hospital_name: Optional[str] = None
    hospital_address: Optional[str] = None
    doctor_name: Optional[str] = None
    examination_date: Optional[str] = None
    medical_report_reference: Optional[str] = None
    injury_observations: Optional[str] = None
    treatment_details: Optional[str] = None
    subject_type: Optional[str] = None
    escort_officer_name: Optional[str] = None
    escort_officer_rank: Optional[str] = None

    # Court / Remand Details
    court_name: Optional[str] = None
    court_address: Optional[str] = None
    judge_details: Optional[str] = None
    remand_type: Optional[str] = None
    remand_duration_days: Optional[int] = None
    remand_start_date: Optional[str] = None
    remand_end_date: Optional[str] = None
    custody_location: Optional[str] = None
    court_order_details: Optional[str] = None

    # Panchanama Details
    panchanama_date_time: Optional[str] = None
    panchanama_location: Optional[str] = None
    identification_marks: Optional[str] = None
    personal_belongings: Optional[str] = None
    panchanama_narrative: Optional[str] = None

    # Test Identification Parade (TIP) Details
    tip_date_time: Optional[str] = None
    tip_location: Optional[str] = None
    dummy_participants: Optional[str] = None
    procedure_description: Optional[str] = None
    identification_result: Optional[str] = None

class InvestigationRecordCreate(InvestigationRecordBase):
    pass

class InvestigationRecordResponse(InvestigationRecordBase):
    id: int
    case_id: int

    class Config:
        from_attributes = True
