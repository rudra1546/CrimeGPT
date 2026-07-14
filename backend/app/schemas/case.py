import json
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class VictimSchema(BaseModel):
    name: str | None = None
    age: int | str | None = None
    gender: str | None = None
    father_mother_name: str | None = None
    address: str | None = None
    contact_number: str | None = None
    occupation: str | None = None

class AccusedSchema(BaseModel):
    name: str | None = None
    age: int | str | None = None
    gender: str | None = None
    address: str | None = None
    known_aliases: str | None = None
    previous_record: str | None = None

class WitnessSchema(BaseModel):
    name: str | None = None
    contact: str | None = None
    address: str | None = None
    statement: str | None = None

class EvidenceItemSchema(BaseModel):
    evidence_type: str | None = None
    description: str | None = None
    recovered_from: str | None = None
    recovery_date: str | None = None
    uploaded_file: str | None = None
    officer_remarks: str | None = None

class CaseDetailsCreate(BaseModel):
    victim_details: VictimSchema | str | None = None
    accused_details: AccusedSchema | str | None = None
    incident_description: str | None = None
    ipc_sections: str | None = None
    evidence_details: list[EvidenceItemSchema] | str | None = None
    witnesses: list[WitnessSchema] | str | None = None
    investigating_officer: str | None = None

class CaseDetailsUpdate(BaseModel):
    victim_details: VictimSchema | str | None = None
    accused_details: AccusedSchema | str | None = None
    incident_description: str | None = None
    ipc_sections: str | None = None
    evidence_details: list[EvidenceItemSchema] | str | None = None
    witnesses: list[WitnessSchema] | str | None = None
    investigating_officer: str | None = None

class CaseDetailsResponse(BaseModel):
    victim_details: VictimSchema | str | None = None
    accused_details: AccusedSchema | str | None = None
    incident_description: str | None = None
    ipc_sections: str | None = None
    evidence_details: list[EvidenceItemSchema] | str | None = None
    witnesses: list[WitnessSchema] | str | None = None
    investigating_officer: str | None = None

    @field_validator('victim_details', 'accused_details', 'evidence_details', 'witnesses', mode='before')
    @classmethod
    def parse_json_fields(cls, v):
        if isinstance(v, str):
            val_stripped = v.strip()
            if val_stripped.startswith('{') or val_stripped.startswith('['):
                try:
                    return json.loads(val_stripped)
                except Exception:
                    pass
        return v

    class Config:
        from_attributes = True

class CaseCreate(BaseModel):
    fir_number: str = Field(..., min_length=1, description="Unique FIR registration number")
    police_station: str = Field(..., min_length=1, description="Police station registered under")
    crime_type: str = Field(..., min_length=1, description="Category of crime committed")
    incident_date: datetime = Field(..., description="Date and time of incident occurrence")
    status: str = Field("active", description="Current case status (e.g. active, closed, pending)")
    details: CaseDetailsCreate | None = Field(None, description="Nested case detailed fields")

class CaseUpdate(BaseModel):
    fir_number: str | None = None
    police_station: str | None = None
    crime_type: str | None = None
    incident_date: datetime | None = None
    status: str | None = None
    details: CaseDetailsUpdate | None = None

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


