from pydantic import BaseModel, Field
from datetime import datetime

class CaseTimelineCreate(BaseModel):
    event_name: str = Field(..., min_length=1, description="Type of event, e.g. FIR Registered, Accused Arrested")
    description: str = Field(..., min_length=1, description="Details of the timeline log entry")

class CaseTimelineResponse(BaseModel):
    id: int
    case_id: int
    event_name: str
    description: str
    timestamp: datetime
    created_by: int

    class Config:
        from_attributes = True
