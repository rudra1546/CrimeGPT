import json
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

# Sub-schemas imports
from app.schemas.evidence import EvidenceResponse
from app.schemas.timeline import CaseTimelineResponse
from app.schemas.witness import WitnessResponse
from app.schemas.suspect import SuspectResponse
from app.schemas.task import TaskResponse
from app.schemas.document import DocumentResponse
from app.schemas.audit import AuditLogResponse

class VictimSchema(BaseModel):
    name: str | None = None
    age: int | str | None = None
    gender: str | None = None
    father_mother_name: str | None = None
    address: str | None = None
    contact_number: str | None = None
    occupation: str | None = None

    class Config:
        from_attributes = True

class AccusedSchema(BaseModel):
    name: str | None = None
    age: int | str | None = None
    gender: str | None = None
    address: str | None = None
    known_aliases: str | None = None
    previous_record: str | None = None

    class Config:
        from_attributes = True

class WitnessSchema(BaseModel):
    name: str | None = None
    contact: str | None = None
    address: str | None = None
    statement: str | None = None

    class Config:
        from_attributes = True

class EvidenceItemSchema(BaseModel):
    evidence_type: str | None = None
    description: str | None = None
    recovered_from: str | None = None
    recovery_date: str | None = None
    uploaded_file: str | None = None
    officer_remarks: str | None = None

    class Config:
        from_attributes = True

class LegalSectionSchema(BaseModel):
    law: str
    section: str
    title: str
    description: str | None = None

    class Config:
        from_attributes = True

class CaseDetailsCreate(BaseModel):
    victim_details: VictimSchema | str | None = None
    accused_details: AccusedSchema | str | None = None
    description: str | None = None
    incident_description: str | None = None
    ipc_sections: str | None = None
    legal_sections: list[LegalSectionSchema] | str | None = None
    evidence_details: list[EvidenceItemSchema] | str | None = None
    witnesses: list[WitnessSchema] | str | None = None
    investigating_officer: str | None = None

    @model_validator(mode='before')
    @classmethod
    def map_description_field(cls, data):
        if isinstance(data, dict):
            desc = data.get("incident_description") or data.get("description")
            data["description"] = desc
            data["incident_description"] = desc
        return data

class CaseDetailsUpdate(BaseModel):
    victim_details: VictimSchema | str | None = None
    accused_details: AccusedSchema | str | None = None
    description: str | None = None
    incident_description: str | None = None
    ipc_sections: str | None = None
    legal_sections: list[LegalSectionSchema] | str | None = None
    evidence_details: list[EvidenceItemSchema] | str | None = None
    witnesses: list[WitnessSchema] | str | None = None
    investigating_officer: str | None = None

    @model_validator(mode='before')
    @classmethod
    def map_description_field(cls, data):
        if isinstance(data, dict):
            desc = data.get("incident_description") or data.get("description")
            data["description"] = desc
            data["incident_description"] = desc
        return data

class CaseDetailsResponse(BaseModel):
    victim_details: VictimSchema | str | None = None
    accused_details: AccusedSchema | str | None = None
    description: str | None = None
    incident_description: str | None = None
    ipc_sections: str | None = None
    legal_sections: list[LegalSectionSchema] | str | None = None
    evidence_details: list[EvidenceItemSchema] | str | None = None
    witnesses: list[WitnessSchema] | str | None = None
    investigating_officer: str | None = None

    @field_validator('victim_details', 'accused_details', 'evidence_details', 'witnesses', 'legal_sections', mode='before')
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

    @model_validator(mode='before')
    @classmethod
    def map_description_field(cls, data):
        if isinstance(data, dict):
            desc = data.get("incident_description") or data.get("description")
            data["description"] = desc
            data["incident_description"] = desc
        else:
            desc = getattr(data, "incident_description", None) or getattr(data, "description", None)
            setattr(data, "description", desc)
            setattr(data, "incident_description", desc)
        return data

    class Config:
        from_attributes = True

class CaseCreate(BaseModel):
    fir_number: str = Field(..., min_length=1, description="Unique FIR registration number")
    police_station: str = Field(..., min_length=1, description="Police station registered under")
    crime_type: str = Field(..., min_length=1, description="Category of crime committed")
    crime_category: str | None = Field(None, description="Detailed category of crime")
    incident_date: datetime = Field(..., description="Date and time of incident occurrence")
    status: str = Field("active", description="Current case status (e.g. active, closed, pending)")
    details: CaseDetailsCreate | None = None
    case_details: CaseDetailsCreate | None = None

    @model_validator(mode='before')
    @classmethod
    def map_details_field(cls, data):
        if isinstance(data, dict):
            det = data.get("details") or data.get("case_details")
            data["details"] = det
            data["case_details"] = det
        return data

class CaseUpdate(BaseModel):
    fir_number: str | None = None
    police_station: str | None = None
    crime_type: str | None = None
    crime_category: str | None = None
    incident_date: datetime | None = None
    status: str | None = None
    details: CaseDetailsUpdate | None = None
    case_details: CaseDetailsUpdate | None = None

    @model_validator(mode='before')
    @classmethod
    def map_details_field(cls, data):
        if isinstance(data, dict):
            det = data.get("details") or data.get("case_details")
            data["details"] = det
            data["case_details"] = det
        return data

class CaseResponse(BaseModel):
    id: int
    fir_number: str
    police_station: str
    crime_type: str
    crime_category: str | None = None
    incident_date: datetime
    status: str
    created_by: int
    details: CaseDetailsResponse | None = None
    case_details: CaseDetailsResponse | None = None
    evidence: list[EvidenceResponse] = []
    timeline: list[CaseTimelineResponse] = []
    witnesses: list[WitnessResponse] = []
    witness_records: list[WitnessResponse] = []
    suspects: list[SuspectResponse] = []
    suspect_records: list[SuspectResponse] = []
    tasks: list[TaskResponse] = []
    task_records: list[TaskResponse] = []
    documents: list[DocumentResponse] = []
    audit_logs: list[AuditLogResponse] = []
    legal_sections: list[LegalSectionSchema] | None = []

    @model_validator(mode='before')
    @classmethod
    def map_details_field(cls, data):
        if isinstance(data, dict):
            det = data.get("details") or data.get("case_details")
            data["details"] = det
            data["case_details"] = det

            wit = data.get("witnesses") or data.get("witness_records") or []
            data["witnesses"] = wit
            data["witness_records"] = wit

            sus = data.get("suspects") or data.get("suspect_records") or []
            data["suspects"] = sus
            data["suspect_records"] = sus

            tsk = data.get("tasks") or data.get("task_records") or []
            data["tasks"] = tsk
            data["task_records"] = tsk
        return data

    @model_validator(mode='after')
    def populate_custom_fields(self):
        if not self.crime_category:
            self.crime_category = self.crime_type
        
        # Populate case_details
        if not self.case_details:
            self.case_details = self.details
        if not self.details:
            self.details = self.case_details

        # Populate witnesses
        if not self.witnesses:
            self.witnesses = self.witness_records
        if not self.witness_records:
            self.witness_records = self.witnesses

        # Populate suspects
        if not self.suspects:
            self.suspects = self.suspect_records
        if not self.suspect_records:
            self.suspect_records = self.suspects

        # Populate tasks
        if not self.tasks:
            self.tasks = self.task_records
        if not self.task_records:
            self.task_records = self.tasks

        details_ref = self.case_details or self.details
        if details_ref and hasattr(details_ref, 'legal_sections') and details_ref.legal_sections:
            if isinstance(details_ref.legal_sections, list):
                self.legal_sections = details_ref.legal_sections
            elif isinstance(details_ref.legal_sections, str):
                try:
                    self.legal_sections = json.loads(details_ref.legal_sections)
                except Exception:
                    self.legal_sections = []
        else:
            self.legal_sections = []
        return self

    class Config:
        from_attributes = True
