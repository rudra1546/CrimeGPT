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
