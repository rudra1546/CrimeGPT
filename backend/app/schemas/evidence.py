from pydantic import BaseModel
from datetime import datetime

class EvidenceMovementResponse(BaseModel):
    id: int
    evidence_id: int
    from_officer: str
    from_officer_badge: str | None = None
    to_officer: str
    to_officer_badge: str | None = None
    transfer_reason: str | None = None
    timestamp: datetime
    remarks: str | None = None

    class Config:
        from_attributes = True

class EvidenceMovementCreate(BaseModel):
    from_officer: str
    from_officer_badge: str | None = None
    to_officer: str
    to_officer_badge: str | None = None
    transfer_reason: str | None = None
    remarks: str | None = None

class EvidenceResponse(BaseModel):
    id: int
    case_id: int
    file_name: str
    file_type: str
    file_path: str
    uploaded_by: int
    uploaded_date: datetime
    evidence_type: str | None = None
    description: str | None = None
    collection_date: datetime | None = None
    collection_location: str | None = None
    collecting_officer: str | None = None
    images_json: str | None = None
    documents_json: str | None = None
    movement_history: list[EvidenceMovementResponse] = []

    class Config:
        from_attributes = True

class EvidenceUpdate(BaseModel):
    evidence_type: str | None = None
    description: str | None = None
    collection_location: str | None = None
    collecting_officer: str | None = None
    images_json: str | None = None
    documents_json: str | None = None
