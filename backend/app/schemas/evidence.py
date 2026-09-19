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

class EvidenceAttachmentResponse(BaseModel):
    id: int
    evidence_id: int | None = None
    case_id: int
    media_type: str
    file_name: str
    storage_path: str
    file_type: str
    file_size: int | None = None
    description: str | None = None
    status: str = "active"
    deletion_requested_at: datetime | None = None
    deleted_at: datetime | None = None
    uploaded_by: int | None = None
    uploaded_at: datetime | None = None

    class Config:
        from_attributes = True

class EvidenceResponse(BaseModel):
    id: int
    case_id: int
    file_name: str | None = None
    file_type: str | None = None
    file_path: str | None = None
    uploaded_by: int | None = None
    uploaded_date: datetime | None = None
    evidence_type: str | None = None
    description: str | None = None
    collection_date: datetime | None = None
    collection_location: str | None = None
    collecting_officer: str | None = None
    images_json: str | None = None
    documents_json: str | None = None
    movement_history: list[EvidenceMovementResponse] = []
    attachments: list[EvidenceAttachmentResponse] = []

    class Config:
        from_attributes = True

class EvidenceUpdate(BaseModel):
    evidence_type: str | None = None
    description: str | None = None
    collection_location: str | None = None
    collecting_officer: str | None = None
    images_json: str | None = None
    documents_json: str | None = None
