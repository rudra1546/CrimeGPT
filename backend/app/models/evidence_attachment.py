from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class EvidenceAttachment(Base):
    __tablename__ = "evidence_attachments"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(Integer, ForeignKey("evidence.id", ondelete="CASCADE"), nullable=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    media_type = Column(String(32), nullable=False)              # 'image', 'audio', 'video'
    file_name = Column(String(255), nullable=False)              # original filename
    storage_path = Column(Text, nullable=False)                   # Supabase Storage path
    file_type = Column(String(128), nullable=False)              # MIME content type
    file_size = Column(BigInteger, nullable=True)                 # size in bytes
    description = Column(Text, nullable=True)                     # optional description
    status = Column(String(32), default="active", nullable=False, index=True) # 'active', 'pending_deletion', 'deleted'
    deletion_requested_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deletion_retry_count = Column(Integer, default=0, nullable=False)
    deletion_error = Column(Text, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    evidence = relationship("Evidence", back_populates="attachments")
    case = relationship("Case")
    uploader = relationship("User")
