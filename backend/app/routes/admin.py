from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.routes.deps import RoleChecker
from app.models.user import User
from app.models.case import Case
from app.models.document import Document
from app.models.timeline import CaseTimeline

router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN"]))])

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
