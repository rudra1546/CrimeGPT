import os
import shutil
import logging
import chromadb
from langchain_chroma import Chroma
from app.rag.embeddings import LocalEmbeddings

logger = logging.getLogger("crimegpt.rag.vectorstore")

# Local directory where ChromaDB files are persisted
CHROMA_DB_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "chroma_db"
)

def get_collection_name() -> str:
    return os.getenv("CHROMA_COLLECTION_NAME", "crimegpt_legal_documents")

def is_reset_vectorstore_enabled() -> bool:
    val = os.getenv("RESET_VECTORSTORE", "false").lower()
    return val in ["true", "1", "yes"]

def delete_existing_collection_or_dir(collection_name: str) -> None:
    """
    Completely deletes the ChromaDB collection or data directory.
    """
    logger.info(f"[ChromaDB] Deleting old collection '{collection_name}'.")
    try:
        client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        client.delete_collection(name=collection_name)
    except Exception as e:
        logger.debug(f"[ChromaDB] Collection delete notice: {e}")

    # Clear persistence directory if needed to wipe corrupt metadata
    if os.path.exists(CHROMA_DB_DIR):
        try:
            shutil.rmtree(CHROMA_DB_DIR, ignore_errors=True)
        except Exception as e:
            logger.warning(f"[ChromaDB] Could not remove ChromaDB directory: {e}")
    os.makedirs(CHROMA_DB_DIR, exist_ok=True)

def reset_vectorstore() -> Chroma:
    """
    Deletes the current collection/store and returns a fresh Chroma instance.
    """
    collection_name = get_collection_name()
    delete_existing_collection_or_dir(collection_name)
    embeddings = LocalEmbeddings()
    return Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings,
        collection_name=collection_name
    )

def verify_and_migrate_chromadb_dimension(embeddings: LocalEmbeddings, collection_name: str) -> None:
    """
    Detects embedding dimension mismatch before insertion or retrieval operations.
    If existing collection dimension != current embedding dimension:
    Deletes the old ChromaDB collection and creates a fresh collection with current dimension.
    """
    current_dim = embeddings.dimension
    
    if is_reset_vectorstore_enabled():
        logger.info("[ChromaDB] RESET_VECTORSTORE is enabled. Deleting existing collection and recreating empty collection.")
        delete_existing_collection_or_dir(collection_name)
        return

    if not os.path.exists(CHROMA_DB_DIR):
        os.makedirs(CHROMA_DB_DIR, exist_ok=True)
        return

    try:
        client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        collections = client.list_collections()
        col_names = [c.name for c in collections] if collections else []
        
        if collection_name not in col_names and "crimegpt_legal" not in col_names:
            # New or non-existent collection
            return

        # Check existing collection
        target_name = collection_name if collection_name in col_names else "crimegpt_legal"
        collection = client.get_collection(name=target_name)
        
        existing_dim = None
        # Peek at existing vectors to detect dimension
        sample = collection.get(limit=1, include=["embeddings"])
        if sample and sample.get("embeddings") is not None and len(sample["embeddings"]) > 0:
            existing_dim = len(sample["embeddings"][0])
        elif hasattr(collection, "_dimensionality") and collection._dimensionality is not None:
            existing_dim = collection._dimensionality

        if existing_dim is not None:
            logger.info(f"[ChromaDB] Existing collection dimension: {existing_dim}")
            logger.info(f"[ChromaDB] Current embedding dimension: {current_dim}")
            
            if existing_dim != current_dim:
                logger.warning("[ChromaDB] Dimension mismatch detected.")
                delete_existing_collection_or_dir(target_name)
                logger.info(f"[ChromaDB] Creating new collection with dimension {current_dim}.")
    except Exception as e:
        err_str = str(e).lower()
        if "dimension" in err_str or "expecting embedding" in err_str or "invalidargumenterror" in err_str:
            logger.warning("[ChromaDB] Dimension mismatch detected during inspection.")
            delete_existing_collection_or_dir(collection_name)
            logger.info(f"[ChromaDB] Creating new collection with dimension {current_dim}.")

def get_vectorstore() -> Chroma:
    """
    Initializes and returns the persistent Chroma vector store instance with LocalEmbeddings.
    Performs dimension mismatch checks and automatic collection recreation prior to store access.
    """
    collection_name = get_collection_name()
    embeddings = LocalEmbeddings()
    
    # Run dimension migration check
    verify_and_migrate_chromadb_dimension(embeddings, collection_name)
    
    os.makedirs(CHROMA_DB_DIR, exist_ok=True)
    return Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings,
        collection_name=collection_name
    )

def add_documents_to_store(chunks: list) -> None:
    """
    Adds a list of LangChain Document objects to the persistent Chroma collection.
    Handles dimension mismatches and logs re-indexing progress.
    """
    if not chunks:
        return

    collection_name = get_collection_name()
    embeddings = LocalEmbeddings()
    current_dim = embeddings.dimension

    logger.info(f"[ChromaDB] Adding {len(chunks)} document chunks to vectorstore...")
    try:
        db = get_vectorstore()
        db.add_documents(chunks)
        logger.info("[ChromaDB] Re-indexing documents completed.")
    except Exception as e:
        err_str = str(e).lower()
        if "dimension" in err_str or "expecting embedding" in err_str:
            logger.warning(f"[ChromaDB] Dimension mismatch detected: {e}")
            delete_existing_collection_or_dir(collection_name)
            logger.info(f"[ChromaDB] Creating new collection with dimension {current_dim}.")
            db = Chroma(
                persist_directory=CHROMA_DB_DIR,
                embedding_function=embeddings,
                collection_name=collection_name
            )
            db.add_documents(chunks)
            logger.info("[ChromaDB] Re-indexing documents completed.")
        else:
            raise e
