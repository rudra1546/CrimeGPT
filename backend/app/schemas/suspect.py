from pydantic import BaseModel

class SuspectCreate(BaseModel):
    name: str
    alias: str | None = None
    address: str | None = None
    identification_marks: str | None = None
    status: str = "Suspect"
    notes: str | None = None

class SuspectUpdate(BaseModel):
    name: str | None = None
    alias: str | None = None
    address: str | None = None
    identification_marks: str | None = None
    status: str | None = None
    notes: str | None = None

class SuspectResponse(BaseModel):
    id: int
    case_id: int
    name: str
    alias: str | None = None
    address: str | None = None
    identification_marks: str | None = None
    status: str
    notes: str | None = None

    class Config:
        from_attributes = True
