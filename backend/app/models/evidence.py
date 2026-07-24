from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_date = Column(DateTime, default=datetime.utcnow)

    # Detailed physical and digital evidence properties (nullable for backward compatibility)
    evidence_type = Column(String, nullable=True) # e.g. Physical, Digital, Document, Weapon
    description = Column(Text, nullable=True)
    collection_date = Column(DateTime, nullable=True)
    collection_location = Column(String, nullable=True)
    collecting_officer = Column(String, nullable=True)
    images_json = Column(Text, nullable=True)  # JSON array of image file paths
    documents_json = Column(Text, nullable=True)  # JSON array of document file paths

    # Relationships
    case = relationship("Case", back_populates="evidence")
    uploader = relationship("User")
    movement_history = relationship("EvidenceMovement", back_populates="evidence", cascade="all, delete-orphan")
