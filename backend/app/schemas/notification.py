from pydantic import BaseModel
from datetime import datetime

class ActivityNotificationItem(BaseModel):
    id: int
    actor: str
    actor_id: int | None = None
    action: str
    timestamp: datetime
    details: str | None = None
    case_id: int | None = None
    fir_number: str | None = None
    category: str
    formatted_message: str

    class Config:
        from_attributes = True

class RecentActivityResponse(BaseModel):
    total: int
    items: list[ActivityNotificationItem]

class PendingCaseReminderItem(BaseModel):
    case_id: int
    fir_number: str
    police_station: str
    crime_type: str
    crime_category: str | None = None
    status: str
    registration_date: datetime
    days_pending: int
    duration_formatted: str
    urgency: str
    investigating_officer: str | None = None

    class Config:
        from_attributes = True

class PendingCasesResponse(BaseModel):
    total_eligible: int
    items: list[PendingCaseReminderItem]

class NotificationSummaryResponse(BaseModel):
    recent_activity_count: int
    pending_cases_count: int
    has_urgent_reminders: bool
    recent_activity: list[ActivityNotificationItem]
    pending_cases: list[PendingCaseReminderItem]
