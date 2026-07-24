from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class EvidenceMovement(Base):
    __tablename__ = "evidence_movement"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(Integer, ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False)
    from_officer = Column(String, nullable=False)
    from_officer_badge = Column(String, nullable=True)
    to_officer = Column(String, nullable=False)
    to_officer_badge = Column(String, nullable=True)
    transfer_reason = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    remarks = Column(Text, nullable=True)

    # Relationships
    evidence = relationship("Evidence", back_populates="movement_history")
