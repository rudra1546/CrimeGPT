from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Witness(Base):
    __tablename__ = "witnesses"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    statement = Column(Text, nullable=True)
    status = Column(String, default="Cooperative", nullable=False) # e.g. Cooperative, Hostile, Unavailable

    # Relationships
    case = relationship("Case", back_populates="witness_records")
