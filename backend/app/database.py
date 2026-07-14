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
            # Check SQLite table info
            cursor = conn.execute(text("PRAGMA table_info(case_details)"))
            cols = [row[1] for row in cursor.fetchall()]
            if cols:  # Table exists
                if "witnesses" not in cols:
                    conn.execute(text("ALTER TABLE case_details ADD COLUMN witnesses TEXT"))
                if "investigating_officer" not in cols:
                    conn.execute(text("ALTER TABLE case_details ADD COLUMN investigating_officer TEXT"))
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
