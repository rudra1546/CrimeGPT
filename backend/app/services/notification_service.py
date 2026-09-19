import re
from datetime import datetime, timezone
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_

from app.models.case import Case
from app.models.case_details import CaseDetails
from app.models.timeline import CaseTimeline
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.notification import (
    ActivityNotificationItem,
    RecentActivityResponse,
    PendingCaseReminderItem,
    PendingCasesResponse,
    NotificationSummaryResponse
)

# Explicit set of investigation statuses representing active, non-completed work
ACTIVE_INVESTIGATION_STATUSES = {"active", "pending_sho_review", "revision_requested"}

# Explicit exclusion set: closed, completed, archived, or cancelled investigations
EXCLUDED_STATUSES = {"closed", "completed", "archived", "cancelled"}

# Regex pattern to identify FIR number in audit descriptions
FIR_PATTERN = re.compile(r'(?:Case\s+)?FIR(?:\s*No\.?|\s*:?)\s*([A-Za-z0-9\-_/]+)', re.IGNORECASE)


def resolve_case_registration_date(case: Case, db: Session) -> datetime | None:
    """
    Resolves the actual registration timestamp for a case.
    Priority:
    1. Timestamp of the 'CASE_CREATED' event in case_timelines.
    2. Timestamp of a matching 'Create Case' entry in audit_logs.
    If neither exists, returns None (unresolved).
    Does NOT use incident_date as fallback.
    """
    # 1. Prefer actual 'CASE_CREATED' timeline event
    if hasattr(case, 'timeline') and case.timeline:
        for item in case.timeline:
            if item.event_name == "CASE_CREATED":
                return item.timestamp

    # If timeline was not preloaded or empty, query database directly
    tl_event = db.query(CaseTimeline).filter(
        CaseTimeline.case_id == case.id,
        CaseTimeline.event_name == "CASE_CREATED"
    ).order_by(CaseTimeline.timestamp.asc()).first()
    if tl_event:
        return tl_event.timestamp

    # 2. Fallback to matching 'Create Case' audit log
    audit_entry = db.query(AuditLog).filter(
        AuditLog.action == "Create Case",
        AuditLog.details.ilike(f"%{case.fir_number}%")
    ).order_by(AuditLog.timestamp.asc()).first()
    if audit_entry:
        return audit_entry.timestamp

    # 3. Mark unresolved if neither exists
    return None


def format_pending_duration(days: int) -> str:
    """Formats days into human-readable duration (e.g. '1 month 12 days', '42 days')."""
    if days < 0:
        return "0 days"
    months = days // 30
    rem_days = days % 30
    if months > 0:
        month_label = f"{months} month{'s' if months > 1 else ''}"
        if rem_days > 0:
            return f"{month_label} {rem_days} day{'s' if rem_days > 1 else ''}"
        return month_label
    return f"{days} day{'s' if days != 1 else ''}"


def calculate_urgency(days: int) -> str:
    """Determines reminder urgency level based on pending duration."""
    if days >= 90:
        return "critical"
    if days >= 60:
        return "high"
    return "moderate"


def categorize_action(action: str) -> str:
    """Categorizes audit actions into high-level event domains."""
    act = action.upper()
    if "CASE" in act:
        return "case"
    if "EVIDENCE" in act or "ATTACHMENT" in act:
        return "evidence"
    if "REVIEW" in act or "SHO" in act:
        return "review"
    if "TASK" in act:
        return "task"
    if "DOCUMENT" in act or "LEGAL" in act:
        return "document"
    return "system"


def sanitize_message(actor: str, action: str, details: str | None, fir: str | None) -> str:
    """Builds a clear, user-friendly activity message without leaking sensitive internal details."""
    act_clean = action.replace("_", " ").title()
    target = f"for Case {fir}" if fir else ""

    if "UPLOAD_EVIDENCE" in action.upper():
        return f"{actor} uploaded supporting evidence {target}".strip()
    if "Create Case" in action:
        return f"{actor} registered new Case {fir or ''}".strip()
    if "Submit Case" in action:
        return f"{actor} submitted Case {fir or ''} for SHO review".strip()
    if "SHO Review" in action:
        return f"{actor} completed supervisory review {target}".strip()
    if "Reopen" in action:
        return f"{actor} reopened Case {fir or ''}".strip()
    if "Close" in action:
        return f"{actor} closed Case {fir or ''}".strip()
    if "Assign" in action:
        return f"{actor} assigned officer {target}".strip()
    if "Add Task" in action:
        return f"{actor} added investigation task {target}".strip()
    if "Delete" in action:
        return f"{actor} removed an item {target}".strip()

    if details and len(details) < 120 and "password" not in details.lower() and "token" not in details.lower():
        return f"{actor}: {details}"
    return f"{actor} performed {act_clean} {target}".strip()


def extract_fir_and_case(details: str | None, fir_to_case_map: dict[str, int]) -> tuple[str | None, int | None]:
    """Extracts FIR number and matching case ID from audit log details."""
    if not details:
        return None, None
    match = FIR_PATTERN.search(details)
    if match:
        fir = match.group(1).strip()
        case_id = fir_to_case_map.get(fir.lower())
        return fir, case_id
    return None, None


def get_accessible_case_ids(db: Session, current_user: User) -> set[int] | None:
    """
    Returns set of case IDs accessible to the logged-in user,
    or None if the user has unrestricted global access (ADMIN / LEGAL_ADVISOR).
    """
    if current_user.role in ("ADMIN", "LEGAL_ADVISOR"):
        return None  # Unrestricted global access

    # Police Officers and SHOs are scoped to their assigned police station or created cases
    query = db.query(Case.id)
    if current_user.police_station:
        query = query.filter(
            or_(
                Case.police_station == current_user.police_station,
                Case.created_by == current_user.id
            )
        )
    else:
        query = query.filter(Case.created_by == current_user.id)

    return {row[0] for row in query.all()}


def get_recent_activity(
    db: Session,
    current_user: User,
    limit: int = 20,
    offset: int = 0
) -> RecentActivityResponse:
    """
    Retrieves recent activity from audit logs visible to the logged-in user.
    Respects role and station authorization.
    """
    accessible_ids = get_accessible_case_ids(db, current_user)

    # Pre-build lookup map of fir_number -> case_id for efficient linking
    cases_query = db.query(Case.id, Case.fir_number)
    if accessible_ids is not None:
        cases_query = cases_query.filter(Case.id.in_(accessible_ids))
    all_cases = cases_query.all()
    fir_to_case_map = {c.fir_number.lower(): c.id for c in all_cases}

    # Query audit logs sorted descending
    audit_query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())

    # If scoped, filter audit logs to matching case FIRs, user's own actions, or user station
    if accessible_ids is not None:
        station_filter = f"%{current_user.police_station}%" if current_user.police_station else ""
        fir_filters = [AuditLog.details.ilike(f"%{fir}%") for fir in fir_to_case_map.keys()]
        conditions = [AuditLog.user_id == current_user.id]
        if station_filter:
            conditions.append(AuditLog.details.ilike(station_filter))
        if fir_filters:
            conditions.extend(fir_filters)
        audit_query = audit_query.filter(or_(*conditions))

    total = audit_query.count()
    logs = audit_query.offset(offset).limit(limit).all()

    items = []
    for log in logs:
        fir, case_id = extract_fir_and_case(log.details, fir_to_case_map)
        actor = log.user_name or "System"
        category = categorize_action(log.action)
        msg = sanitize_message(actor, log.action, log.details, fir)

        items.append(
            ActivityNotificationItem(
                id=log.id,
                actor=actor,
                actor_id=log.user_id,
                action=log.action,
                timestamp=log.timestamp.replace(tzinfo=timezone.utc) if log.timestamp.tzinfo is None else log.timestamp,
                details=log.details,
                case_id=case_id,
                fir_number=fir,
                category=category,
                formatted_message=msg
            )
        )

    return RecentActivityResponse(total=total, items=items)


def get_eligible_pending_cases(
    db: Session,
    current_user: User,
    min_days: int = 30,
    limit: int = 20,
    offset: int = 0
) -> PendingCasesResponse:
    """
    Retrieves active, non-completed cases registered at least min_days (default 30 days) ago.
    Calculates duration from actual registration date.
    Excludes completed/closed cases and cases with unresolved registration dates.
    """
    accessible_ids = get_accessible_case_ids(db, current_user)

    # Query active cases only, excluding closed/completed/cancelled
    case_query = db.query(Case).options(
        selectinload(Case.timeline),
        selectinload(Case.details)
    )

    if accessible_ids is not None:
        case_query = case_query.filter(Case.id.in_(accessible_ids))

    all_active_cases = [
        c for c in case_query.all()
        if c.status and c.status.lower() in ACTIVE_INVESTIGATION_STATUSES and c.status.lower() not in EXCLUDED_STATUSES
    ]

    now = datetime.now(timezone.utc)
    eligible_items: list[PendingCaseReminderItem] = []

    for c in all_active_cases:
        reg_date = resolve_case_registration_date(c, db)
        # Requirement 1: If neither CASE_CREATED timeline nor Create Case audit exists, exclude
        if reg_date is None:
            continue

        if reg_date.tzinfo is None:
            reg_date = reg_date.replace(tzinfo=timezone.utc)

        diff = now - reg_date
        days_pending = diff.days

        # Exclude newer cases that have not yet reached the age threshold
        if days_pending < min_days:
            continue

        investigating_officer = c.details.investigating_officer if c.details else None

        eligible_items.append(
            PendingCaseReminderItem(
                case_id=c.id,
                fir_number=c.fir_number,
                police_station=c.police_station,
                crime_type=c.crime_type,
                crime_category=c.crime_category,
                status=c.status,
                registration_date=reg_date,
                days_pending=days_pending,
                duration_formatted=format_pending_duration(days_pending),
                urgency=calculate_urgency(days_pending),
                investigating_officer=investigating_officer
            )
        )

    # Sort descending by days pending (longest unresolved cases first)
    eligible_items.sort(key=lambda item: item.days_pending, reverse=True)

    total_eligible = len(eligible_items)
    paginated_items = eligible_items[offset : offset + limit]

    return PendingCasesResponse(total_eligible=total_eligible, items=paginated_items)


def get_notification_summary(db: Session, current_user: User) -> NotificationSummaryResponse:
    """
    Generates bounded summary data for the dashboard bell badge count and popup.
    """
    # Fetch top 5 recent activities
    recent = get_recent_activity(db, current_user, limit=5, offset=0)

    # Fetch top 5 pending case reminders
    pending = get_eligible_pending_cases(db, current_user, min_days=30, limit=5, offset=0)

    has_urgent = any(item.urgency in ("high", "critical") for item in pending.items)

    return NotificationSummaryResponse(
        recent_activity_count=recent.total,
        pending_cases_count=pending.total_eligible,
        has_urgent_reminders=has_urgent,
        recent_activity=recent.items,
        pending_cases=pending.items
    )
