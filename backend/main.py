import os
import json
import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Configure production logging format and file handlers
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("crimegpt_production.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("crimegpt.main")
logger.info("Initializing CrimeGPT Production server process...")

from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app import models
from app.routes.auth import router as auth_router
from app.routes.cases import router as cases_router
from app.routes.documents import router as documents_router
from app.routes.legal import router as legal_router
from app.routes.admin import router as admin_router
from app.routes.witnesses import router as witnesses_router
from app.routes.suspects import router as suspects_router
from app.routes.tasks import router as tasks_router
from app.routes.audit import router as audit_router
from app.routes.legal_advisor import router as legal_advisor_router
from app.routes.crimes import router as crimes_router
from app.routes.investigation import router as investigation_router

# Load environment variables from .env
load_dotenv(override=True)

app = FastAPI(
    title="CrimeGPT API",
    description="Backend API for CrimeGPT analytical dashboard",
    version="1.0.0"
)

# Setup CORS for React frontend
allowed_origins_str = os.getenv("ALLOWED_ORIGINS")
origins = []

if allowed_origins_str:
    try:
        parsed = json.loads(allowed_origins_str)
        if isinstance(parsed, list):
            origins.extend(parsed)
        elif isinstance(parsed, str):
            origins.extend([o.strip() for o in parsed.split(",") if o.strip()])
    except Exception:
        origins.extend([o.strip() for o in allowed_origins_str.split(",") if o.strip()])

# Ensure essential development origins are included
default_dev_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
for dev_origin in default_dev_origins:
    if dev_origin not in origins:
        origins.append(dev_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("CORS ORIGINS:", origins)

# Automatically create database tables (for development convenience)
Base.metadata.create_all(bind=engine)

# Register routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(cases_router, prefix="/api/cases", tags=["Cases"])
app.include_router(documents_router, prefix="/api/documents", tags=["Documents"])
app.include_router(legal_router, prefix="/api/legal", tags=["Legal Knowledge RAG"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin Control"])
app.include_router(witnesses_router, prefix="/api/witnesses", tags=["Witnesses"])
app.include_router(suspects_router, prefix="/api/suspects", tags=["Suspects"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["Investigation Tasks"])
app.include_router(audit_router, prefix="/api/audit", tags=["Audit Log"])
app.include_router(legal_advisor_router, prefix="/api/legal-advisor", tags=["Legal Advisor"])
app.include_router(crimes_router, prefix="/api/crimes", tags=["Crimes"])
app.include_router(investigation_router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "CrimeGPT Backend API is running successfully.",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Execute a simple query to verify the database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status
    }
