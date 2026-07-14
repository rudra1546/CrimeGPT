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

# Load environment variables from .env
load_dotenv(override=True)

app = FastAPI(
    title="CrimeGPT API",
    description="Backend API for CrimeGPT analytical dashboard",
    version="1.0.0"
)

# Setup CORS for React frontend
allowed_origins_str = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_str:
    try:
        origins = json.loads(allowed_origins_str)
    except Exception:
        origins = [allowed_origins_str]
else:
    origins = [
        "http://localhost:3000",  # Default React development port
        "http://localhost:5173",  # Default Vite + React development port
    ]

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
