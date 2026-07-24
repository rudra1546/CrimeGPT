from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from datetime import datetime

def log_audit(db: Session, user_id: int | None, user_name: str, action: str, details: str | None = None):
    """
    Utility function to log user actions in the Audit Log table.
    """
    try:
        log_entry = AuditLog(
            user_id=user_id,
            user_name=user_name,
            action=action,
            timestamp=datetime.utcnow(),
            details=details
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        import logging
        logging.getLogger("crimegpt.audit").error(f"Failed to log audit action: {e}")
