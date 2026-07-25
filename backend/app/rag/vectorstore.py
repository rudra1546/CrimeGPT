import os
import logging
from typing import List
from langchain_postgres import PGVector
from app.rag.embeddings import LocalEmbeddings

logger = logging.getLogger("crimegpt.rag.vectorstore")

COLLECTION_NAME = "crimegpt_legal_documents"

def get_connection_string() -> str:
    """
    Returns driver-compatible connection string for PostgreSQL / Supabase pgvector.
    Supports both postgresql:// and postgres:// formats without logging sensitive credentials.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is missing.")

    # Normalize connection string for psycopg3 / SQLAlchemy
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+psycopg://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
        
    return db_url

def get_vectorstore() -> PGVector:
    """
    Initializes and returns the PGVector instance pointing to Supabase.
    Safely creates tables if they do not exist without dropping or resetting existing embeddings.
    """
    connection = get_connection_string()
    embeddings = LocalEmbeddings()

    vectorstore = PGVector(
        embeddings=embeddings,
        collection_name=COLLECTION_NAME,
        connection=connection,
        use_jsonb=True,
    )
    
    # Ensure tables exist without overwriting or deleting data
    try:
        vectorstore.create_tables_if_not_exists()
    except Exception as e:
        logger.debug(f"[PGVector] Table check note: {e}")

    return vectorstore

def get_vector_count() -> int:
    """
    Returns the total count of vector embeddings stored in Supabase pgvector table.
    Does not leak connection details.
    """
    try:
        from sqlalchemy import create_engine, text
        connection = get_connection_string()
        engine = create_engine(connection)
        with engine.connect() as conn:
            res = conn.execute(text("SELECT COUNT(*) FROM langchain_pg_embedding;"))
            count = res.scalar()
            return count or 0
    except Exception as e:
        logger.warning(f"[PGVector] Could not query vector count: {e}")
        return 0

def add_documents_to_store(chunks: List) -> None:
    """
    Adds a list of LangChain Document objects to the persistent Supabase pgvector store.
    """
    if not chunks:
        return

    logger.info(f"[PGVector] Adding {len(chunks)} document chunks to Supabase pgvector...")
    try:
        db = get_vectorstore()
        db.add_documents(chunks)
        total_count = get_vector_count()
        logger.info(f"[PGVector] Successfully indexed documents. Total vectors in Supabase: {total_count}")
    except Exception as e:
        logger.error(f"[PGVector] Failed to add documents to vectorstore: {e}")
        raise e
