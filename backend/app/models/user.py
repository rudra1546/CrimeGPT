from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="POLICE_OFFICER", nullable=False)
    police_station = Column(String, default="Central Police Station", nullable=True)
    status = Column(String, default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    cases = relationship("Case", back_populates="creator")
