# RAG architecture package
from app.rag.loader import load_pdf_text, split_text_to_chunks, load_and_chunk_file
from app.rag.embeddings import GeminiEmbeddings
from app.rag.vectorstore import get_vectorstore, add_documents_to_store, get_vector_count
from app.rag.retriever import retrieve_context, answer_query_with_rag

__all__ = [
    "load_pdf_text",
    "split_text_to_chunks",
    "load_and_chunk_file",
    "GeminiEmbeddings",
    "get_vectorstore",
    "add_documents_to_store",
    "get_vector_count",
    "retrieve_context",
    "answer_query_with_rag"
]
