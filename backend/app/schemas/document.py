from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field

class DocumentType(str, Enum):
    SEIZURE_MEMO = "seizure_memo"
    REMAND_APPLICATION = "remand_application"
    CHARGE_SHEET = "charge_sheet"

class DocumentGenerateRequest(BaseModel):
    case_id: int = Field(..., description="ID of the case to generate a document for")
    document_type: DocumentType = Field(..., description="Type of document to generate")

class DocumentResponse(BaseModel):
    id: int
    case_id: int
    document_type: str
    generated_content: str
    created_date: datetime
    created_by: int | None

    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    id: int
    case_id: int
    fir_number: str
    document_type: str
    generated_content: str
    created_date: datetime
    created_by: int | None
    created_by_name: str | None

    class Config:
        from_attributes = True

