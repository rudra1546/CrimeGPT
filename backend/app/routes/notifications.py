from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.deps import RoleChecker, get_current_user_flexible
from app.schemas.notification import (
    RecentActivityResponse,
    PendingCasesResponse,
    NotificationSummaryResponse
)
from app.services import notification_service

router = APIRouter(
    dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]))]
)

@router.get("/recent-activity", response_model=RecentActivityResponse, status_code=status.HTTP_200_OK)
def get_recent_activity(
    limit: int = Query(20, ge=1, le=100, description="Max activity items to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible)
):
    """
    Retrieves recent CrimeGPT system and user activity from the audit trail,
    filtered by user role and case/station authorization.
    """
    return notification_service.get_recent_activity(
        db=db,
        current_user=current_user,
        limit=limit,
        offset=offset
    )

@router.get("/pending-cases", response_model=PendingCasesResponse, status_code=status.HTTP_200_OK)
def get_pending_cases(
    min_days: int = Query(30, ge=1, description="Minimum days elapsed since case registration"),
    limit: int = Query(20, ge=1, le=100, description="Max pending case reminders to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible)
):
    """
    Retrieves active, non-completed cases registered at least min_days (default 30 days) ago.
    Calculates duration strictly from actual registration date.
    Excludes completed/closed cases and cases with unresolved registration dates.
    """
    return notification_service.get_eligible_pending_cases(
        db=db,
        current_user=current_user,
        min_days=min_days,
        limit=limit,
        offset=offset
    )

@router.get("/summary", response_model=NotificationSummaryResponse, status_code=status.HTTP_200_OK)
def get_notification_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible)
):
    """
    Retrieves bounded summary metrics and previews for the dashboard notification bell badge
    and future reminder popup.
    """
    return notification_service.get_notification_summary(
        db=db,
        current_user=current_user
    )
