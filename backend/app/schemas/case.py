from datetime import datetime
from pydantic import BaseModel, Field

class CaseDetailsCreate(BaseModel):
    victim_details: str | None = Field(None, description="Details of the victim(s)")
    accused_details: str | None = Field(None, description="Details of the accused person(s)")
    incident_description: str | None = Field(None, description="Description of the crime incident")
    ipc_sections: str | None = Field(None, description="Comma-separated or listed IPC sections applicable")
    evidence_details: str | None = Field(None, description="Details of collected evidence")

class CaseCreate(BaseModel):
    fir_number: str = Field(..., min_length=1, description="Unique FIR registration number")
    police_station: str = Field(..., min_length=1, description="Police station registered under")
    crime_type: str = Field(..., min_length=1, description="Category of crime committed")
    incident_date: datetime = Field(..., description="Date and time of incident occurrence")
    status: str = Field("active", description="Current case status (e.g. active, closed, pending)")
    details: CaseDetailsCreate | None = Field(None, description="Nested case detailed fields")

class CaseDetailsUpdate(BaseModel):
    victim_details: str | None = None
    accused_details: str | None = None
    incident_description: str | None = None
    ipc_sections: str | None = None
    evidence_details: str | None = None

class CaseUpdate(BaseModel):
    fir_number: str | None = None
    police_station: str | None = None
    crime_type: str | None = None
    incident_date: datetime | None = None
    status: str | None = None
    details: CaseDetailsUpdate | None = None

class CaseDetailsResponse(BaseModel):
    victim_details: str | None
    accused_details: str | None
    incident_description: str | None
    ipc_sections: str | None
    evidence_details: str | None

    class Config:
        from_attributes = True

from app.schemas.evidence import EvidenceResponse
from app.schemas.timeline import CaseTimelineResponse

class CaseResponse(BaseModel):
    id: int
    fir_number: str
    police_station: str
    crime_type: str
    incident_date: datetime
    status: str
    created_by: int
    details: CaseDetailsResponse | None
    evidence: list[EvidenceResponse] = []
    timeline: list[CaseTimelineResponse] = []

    class Config:
        from_attributes = True


