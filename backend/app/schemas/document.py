from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field

class DocumentType(str, Enum):
    SEIZURE_MEMO = "seizure_memo"
    REMAND_APPLICATION = "remand_application"
    CHARGE_SHEET = "charge_sheet"
    CASE_SUMMARY = "case_summary"
    PURVANI_CHARGESHEET = "purvani_chargesheet"
    MEDICAL_TREATMENT_LETTER = "medical_treatment_letter"
    REMAND_REQUEST_LETTER = "remand_request_letter"
    SEIZURE_RECEIPT = "seizure_receipt"
    COURT_CUSTODY_LETTER = "court_custody_letter"
    ACCUSED_PANCHANAMA = "accused_panchanama"
    FACE_IDENTIFICATION_FORM = "face_identification_form"

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
    pdf_path: str | None = None
    docx_path: str | None = None
    template_name: str | None = None
    preview_text: str | None = None

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
    pdf_path: str | None = None
    docx_path: str | None = None
    template_name: str | None = None
    preview_text: str | None = None

    class Config:
        from_attributes = True

