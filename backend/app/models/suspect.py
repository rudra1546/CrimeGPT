from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Suspect(Base):
    __tablename__ = "suspects"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    alias = Column(String, nullable=True)
    address = Column(String, nullable=True)
    identification_marks = Column(String, nullable=True)
    status = Column(String, default="Suspect", nullable=False) # e.g. Suspect, Arrested, Absconding, Released
    notes = Column(Text, nullable=True)

    # Relationships
    case = relationship("Case", back_populates="suspect_records")
