from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class InvestigationRecord(Base):
    __tablename__ = "investigation_records"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Medical Records
    hospital_name = Column(String, nullable=True)
    hospital_address = Column(String, nullable=True)
    doctor_name = Column(String, nullable=True)
    examination_date = Column(String, nullable=True)
    medical_report_reference = Column(String, nullable=True)
    injury_observations = Column(Text, nullable=True)
    treatment_details = Column(Text, nullable=True)
    subject_type = Column(String, nullable=True) # Accused / Victim / Injured
    escort_officer_name = Column(String, nullable=True)
    escort_officer_rank = Column(String, nullable=True)

    # Court / Remand Details
    court_name = Column(String, nullable=True)
    court_address = Column(String, nullable=True)
    judge_details = Column(String, nullable=True)
    remand_type = Column(String, nullable=True) # Police Custody / Judicial Custody
    remand_duration_days = Column(Integer, nullable=True)
    remand_start_date = Column(String, nullable=True)
    remand_end_date = Column(String, nullable=True)
    custody_location = Column(String, nullable=True)
    court_order_details = Column(Text, nullable=True)

    # Panchanama Details
    panchanama_date_time = Column(String, nullable=True)
    panchanama_location = Column(String, nullable=True)
    identification_marks = Column(Text, nullable=True)
    personal_belongings = Column(Text, nullable=True)
    panchanama_narrative = Column(Text, nullable=True)

    # Test Identification Parade (TIP) Details
    tip_date_time = Column(String, nullable=True)
    tip_location = Column(String, nullable=True)
    dummy_participants = Column(Text, nullable=True)
    procedure_description = Column(Text, nullable=True)
    identification_result = Column(Text, nullable=True)

    # Relationship
    case = relationship("Case", back_populates="investigation_record")
