from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    fir_number = Column(String, unique=True, index=True, nullable=False)
    police_station = Column(String, nullable=False)
    crime_type = Column(String, nullable=False)
    crime_category = Column(String, nullable=True)
    incident_date = Column(DateTime, nullable=False)
    status = Column(String, default="active", nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="cases")
    details = relationship("CaseDetails", uselist=False, back_populates="case", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    timeline = relationship("CaseTimeline", back_populates="case", cascade="all, delete-orphan", order_by="CaseTimeline.timestamp.asc()")
    witness_records = relationship("Witness", back_populates="case", cascade="all, delete-orphan")
    suspect_records = relationship("Suspect", back_populates="case", cascade="all, delete-orphan")
    task_records = relationship("InvestigationTask", back_populates="case", cascade="all, delete-orphan")
    investigation_record = relationship("InvestigationRecord", uselist=False, back_populates="case", cascade="all, delete-orphan")


