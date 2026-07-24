from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogResponse
from app.routes.deps import RoleChecker

router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "SHO", "POLICE_OFFICER", "LEGAL_ADVISOR"]))])

@router.get("/", response_model=list[AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    """
    Retrieves the recent audit trail logs, sorted by timestamp descending.
    """
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(150).all()
