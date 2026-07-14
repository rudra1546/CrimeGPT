import os
from langchain_community.vectorstores import Chroma
from app.rag.embeddings import GeminiEmbeddings

# Local directory where ChromaDB files will be persisted
CHROMA_DB_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "chroma_db"
)

def get_vectorstore() -> Chroma:
    """
    Initializes and returns the Chroma vector store instance with the custom Gemini embedding function.
    """
    embeddings = GeminiEmbeddings()
    os.makedirs(CHROMA_DB_DIR, exist_ok=True)
    return Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings,
        collection_name="crimegpt_legal"
    )

def add_documents_to_store(chunks: list) -> None:
    """
    Adds a list of LangChain Document objects to the persistent Chroma collection.
    """
    db = get_vectorstore()
    db.add_documents(chunks)
