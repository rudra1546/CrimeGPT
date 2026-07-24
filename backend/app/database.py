import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file
load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crimegpt.db")

# For SQLite, set check_same_thread to False to allow multi-threaded access in FastAPI
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Startup migration safety check for missing columns
try:
    from sqlalchemy import text
    with engine.begin() as conn:
        if DATABASE_URL.startswith("sqlite"):
            # Check SQLite table info for case_details
            cursor = conn.execute(text("PRAGMA table_info(case_details)"))
            cols = [row[1] for row in cursor.fetchall()]
            if cols:  # Table exists
                if "witnesses" not in cols:
                    conn.execute(text("ALTER TABLE case_details ADD COLUMN witnesses TEXT"))
                if "investigating_officer" not in cols:
                    conn.execute(text("ALTER TABLE case_details ADD COLUMN investigating_officer TEXT"))
                if "legal_sections" not in cols:
                    conn.execute(text("ALTER TABLE case_details ADD COLUMN legal_sections TEXT"))
            
            # Check SQLite table info for cases
            cursor_cs = conn.execute(text("PRAGMA table_info(cases)"))
            cols_cs = [row[1] for row in cursor_cs.fetchall()]
            if cols_cs:
                if "crime_category" not in cols_cs:
                    conn.execute(text("ALTER TABLE cases ADD COLUMN crime_category TEXT"))
            
            # Check SQLite table info for evidence
            cursor_ev = conn.execute(text("PRAGMA table_info(evidence)"))
            cols_ev = [row[1] for row in cursor_ev.fetchall()]
            if cols_ev:
                if "evidence_type" not in cols_ev:
                    conn.execute(text("ALTER TABLE evidence ADD COLUMN evidence_type TEXT"))
                if "description" not in cols_ev:
                    conn.execute(text("ALTER TABLE evidence ADD COLUMN description TEXT"))
                if "collection_date" not in cols_ev:
                    conn.execute(text("ALTER TABLE evidence ADD COLUMN collection_date DATETIME"))
                if "collection_location" not in cols_ev:
                    conn.execute(text("ALTER TABLE evidence ADD COLUMN collection_location TEXT"))
                if "collecting_officer" not in cols_ev:
                    conn.execute(text("ALTER TABLE evidence ADD COLUMN collecting_officer TEXT"))
                if "images_json" not in cols_ev:
                    conn.execute(text("ALTER TABLE evidence ADD COLUMN images_json TEXT"))
                if "documents_json" not in cols_ev:
                    conn.execute(text("ALTER TABLE evidence ADD COLUMN documents_json TEXT"))

            # Check SQLite table info for users
            cursor_usr = conn.execute(text("PRAGMA table_info(users)"))
            cols_usr = [row[1] for row in cursor_usr.fetchall()]
            if cols_usr:
                if "police_station" not in cols_usr:
                    conn.execute(text("ALTER TABLE users ADD COLUMN police_station TEXT DEFAULT 'Central Police Station'"))
                if "status" not in cols_usr:
                    conn.execute(text("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'ACTIVE'"))
                if "created_at" not in cols_usr:
                    conn.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT '2026-07-22 00:00:00'"))
                if "last_login_at" not in cols_usr:
                    conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at DATETIME"))
        else:
            # For PostgreSQL or other databases, try-catch alter commands
            try:
                conn.execute(text("ALTER TABLE case_details ADD COLUMN witnesses TEXT"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE case_details ADD COLUMN investigating_officer TEXT"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE case_details ADD COLUMN legal_sections TEXT"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE cases ADD COLUMN crime_category TEXT"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE evidence ADD COLUMN evidence_type TEXT"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE evidence ADD COLUMN description TEXT"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE evidence ADD COLUMN collection_date TIMESTAMP"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE evidence ADD COLUMN collection_location TEXT"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE evidence ADD COLUMN collecting_officer TEXT"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE evidence ADD COLUMN images_json TEXT"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE evidence ADD COLUMN documents_json TEXT"))
            except Exception:
                pass
except Exception as e:
    import logging
    logging.getLogger("crimegpt.database").warning(f"Startup migration warning: {e}")

# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Declarative Base for models
Base = declarative_base()

# Dependency to get db session in path operations
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
