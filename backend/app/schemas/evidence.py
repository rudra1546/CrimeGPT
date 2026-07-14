from pydantic import BaseModel
from datetime import datetime

class EvidenceResponse(BaseModel):
    id: int
    case_id: int
    file_name: str
    file_type: str
    file_path: str
    uploaded_by: int
    uploaded_date: datetime

    class Config:
        from_attributes = True
