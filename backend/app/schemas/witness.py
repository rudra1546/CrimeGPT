from pydantic import BaseModel

class WitnessCreate(BaseModel):
    name: str
    phone: str | None = None
    address: str | None = None
    statement: str | None = None
    status: str = "Cooperative"

class WitnessUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None
    statement: str | None = None
    status: str | None = None

class WitnessResponse(BaseModel):
    id: int
    case_id: int
    name: str
    phone: str | None = None
    address: str | None = None
    statement: str | None = None
    status: str

    class Config:
        from_attributes = True
