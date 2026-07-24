from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class InvestigationTask(Base):
    __tablename__ = "investigation_tasks"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="Pending", nullable=False) # e.g. Pending, In Progress, Completed
    assigned_to = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)

    # Relationships
    case = relationship("Case", back_populates="task_records")
