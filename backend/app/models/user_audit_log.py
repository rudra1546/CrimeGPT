from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class UserAuditLog(Base):
    __tablename__ = "user_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String, nullable=False)
    user_email = Column(String, nullable=False)
    role = Column(String, nullable=False)
    action = Column(String, nullable=False)  # CREATED, ACTIVATED, DEACTIVATED, ROLE_CHANGED, DELETED, LOGIN
    status_after_action = Column(String, nullable=False)  # ACTIVE, INACTIVE, DELETED
    performed_by = Column(String, default="System", nullable=False)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
