from pydantic import BaseModel
from datetime import datetime

class TaskCreate(BaseModel):
    case_id: int
    title: str
    description: str | None = None
    status: str = "Pending"
    assigned_to: str | None = None
    due_date: datetime | None = None

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    due_date: datetime | None = None

class TaskResponse(BaseModel):
    id: int
    case_id: int
    title: str
    description: str | None = None
    status: str
    assigned_to: str | None = None
    due_date: datetime | None = None

    class Config:
        from_attributes = True
