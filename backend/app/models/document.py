from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String, nullable=False)  # e.g., FIR summary, charge sheet opposition, bail opposition
    generated_content = Column(Text, nullable=False)
    created_date = Column(DateTime, server_default=func.now(), nullable=False)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    case = relationship("Case", back_populates="documents")
    creator = relationship("User")

