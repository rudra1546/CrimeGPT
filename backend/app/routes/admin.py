from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.routes.deps import RoleChecker
from app.models.user import User
from app.models.case import Case
from app.models.document import Document
from app.models.timeline import CaseTimeline

router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]))])

@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    """
    Returns administrative telemetry, recent timeline activities, and category distributions.
    """
    try:
        total_police = db.query(User).filter(User.role == "POLICE_OFFICER").count()
        total_admins = db.query(User).filter(User.role == "ADMIN").count()
        total_users = total_police + total_admins
        
        total_cases = db.query(Case).count()
        total_docs = db.query(Document).count()
        
        from app.models.evidence import Evidence
        from app.models.case_details import CaseDetails
        import json

        table_evidence_count = db.query(Evidence).count()
        json_evidence_count = 0
        details_list = db.query(CaseDetails).all()
        for det in details_list:
            if det.evidence_details:
                try:
                    parsed = json.loads(det.evidence_details) if isinstance(det.evidence_details, str) else det.evidence_details
                    if isinstance(parsed, list):
                        json_evidence_count += len(parsed)
                except Exception:
                    pass

        total_evidence = table_evidence_count + json_evidence_count
        active_cases = db.query(Case).filter(Case.status.ilike("active")).count()
        closed_cases = db.query(Case).filter(Case.status.ilike("closed")).count()
        
        # Recent activities (Timeline Events)
        recent_activities = []
        activities = db.query(CaseTimeline).order_by(CaseTimeline.timestamp.desc()).limit(10).all()
        for act in activities:
            case = db.query(Case).filter(Case.id == act.case_id).first()
            user = db.query(User).filter(User.id == act.created_by).first()
            recent_activities.append({
                "id": act.id,
                "case_id": act.case_id,
                "fir_number": case.fir_number if case else "N/A",
                "event_name": act.event_name,
                "description": act.description,
                "timestamp": act.timestamp.isoformat(),
                "created_by_name": user.name if user else "System"
            })
            
        # Case categories distribution
        category_counts = db.query(Case.crime_type, func.count(Case.id)).group_by(Case.crime_type).all()
        case_distribution = [{"name": cat or "Unknown", "value": cnt} for cat, cnt in category_counts]
        
        # Documents distribution
        doc_counts = db.query(Document.document_type, func.count(Document.id)).group_by(Document.document_type).all()
        document_distribution = [{"name": doc_type.replace('_', ' ').title(), "value": cnt} for doc_type, cnt in doc_counts]
        
        # Weekly case trend
        trend_counts = db.query(func.date(Case.incident_date), func.count(Case.id)).group_by(func.date(Case.incident_date)).order_by(func.date(Case.incident_date)).all()
        case_trend = [{"date": str(date), "cases": cnt} for date, cnt in trend_counts]
        
        return {
            "total_users": total_users,
            "total_police": total_police,
            "total_cases": total_cases,
            "active_cases": active_cases,
            "closed_cases": closed_cases,
            "total_evidence": total_evidence,
            "total_documents": total_docs,
            "recent_activities": recent_activities,
            "case_distribution": case_distribution,
            "document_distribution": document_distribution,
            "case_trend": case_trend
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed compiling analytics stats: {str(e)}"
        )

from pydantic import BaseModel

class UpdateUserStatusRequest(BaseModel):
    status: str

class UpdateUserRoleRequest(BaseModel):
    role: str

from datetime import datetime
from app.models.user_audit_log import UserAuditLog

@router.get("/users")
def get_admin_users(
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """
    Returns directory of all registered portal users (Admin only).
    Does NOT return password hashes.
    """
    try:
        query = db.query(User).order_by(User.id.asc())
        if not include_deleted:
            query = query.filter(User.status != "DELETED")
            
        users = query.all()
        user_list = []
        for u in users:
            station = getattr(u, "police_station", None) or "Central Police Station"
            user_status = getattr(u, "status", None) or "ACTIVE"
            created_val = getattr(u, "created_at", None)
            created_str = created_val.strftime("%Y-%m-%d") if created_val else "2026-07-22"
            
            last_login = getattr(u, "last_login_at", None)
            last_login_str = last_login.strftime("%Y-%m-%d %H:%M") if last_login else "Never"
            
            user_list.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "station": station,
                "status": user_status,
                "created_at": created_str,
                "last_login_at": last_login_str
            })
        return {"users": user_list}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed retrieving registered personnel directory: {str(e)}"
        )

@router.get("/user-audit-logs")
def get_user_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """
    Returns audit history log entries for all user management actions (Admin only).
    """
    try:
        logs = db.query(UserAuditLog).order_by(UserAuditLog.timestamp.desc()).all()
        log_list = []
        for log in logs:
            log_list.append({
                "id": log.id,
                "user_id": log.user_id,
                "user_name": log.user_name,
                "user_email": log.user_email,
                "role": log.role,
                "action": log.action,
                "status_after_action": log.status_after_action,
                "performed_by": log.performed_by,
                "details": log.details,
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            })
        return {"audit_logs": log_list}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed retrieving user audit history logs: {str(e)}"
        )

@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    req: UpdateUserStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """
    Activate or deactivate user account (Admin only).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User record not found")
    
    new_status = req.status.upper()
    user.status = new_status
    
    # Record Audit Entry
    action_type = "ACTIVATED" if new_status == "ACTIVE" else "DEACTIVATED"
    audit = UserAuditLog(
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        role=user.role,
        action=action_type,
        status_after_action=new_status,
        performed_by=current_user.name if current_user else "Admin",
        details=f"Account status updated to {new_status}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return {"message": f"User account status updated to {new_status}", "status": user.status}

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    req: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """
    Update assigned user clearance role (Admin only).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User record not found")
    
    old_role = user.role
    new_role = req.role.upper()
    user.role = new_role
    
    # Record Audit Entry
    audit = UserAuditLog(
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        role=new_role,
        action="ROLE_CHANGED",
        status_after_action=user.status,
        performed_by=current_user.name if current_user else "Admin",
        details=f"Clearance role changed from {old_role} to {new_role}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return {"message": f"User clearance role updated to {new_role}", "role": user.role}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN"]))
):
    """
    Soft-delete user account (Admin only).
    Preserves audit history record and sets status to DELETED.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User record not found")
    
    user_name = user.name
    user_email = user.email
    user_role = user.role

    # Soft delete: update status to DELETED
    user.status = "DELETED"
    
    # Record Audit Entry
    audit = UserAuditLog(
        user_id=user.id,
        user_name=user_name,
        user_email=user_email,
        role=user_role,
        action="DELETED",
        status_after_action="DELETED",
        performed_by=current_user.name if current_user else "Admin",
        details=f"User account deleted by Admin",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {"message": f"User deleted successfully: {user_name}", "name": user_name, "id": user_id}
