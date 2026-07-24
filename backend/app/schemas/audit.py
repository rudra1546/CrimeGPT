from pydantic import BaseModel
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None = None
    user_name: str
    action: str
    timestamp: datetime
    details: str | None = None

    class Config:
        from_attributes = True
