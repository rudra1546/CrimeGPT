from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class CaseDetails(Base):
    __tablename__ = "case_details"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), unique=True, nullable=False)
    victim_details = Column(Text, nullable=True)
    accused_details = Column(Text, nullable=True)
    incident_description = Column(Text, nullable=True)
    ipc_sections = Column(Text, nullable=True)  # Comma-separated or serialized list of IPC sections
    evidence_details = Column(Text, nullable=True)

    # Relationships
    case = relationship("Case", back_populates="details")
