import logging
from app.rag.vectorstore import get_vectorstore
from app.ai.gemini import generate_document

logger = logging.getLogger("crimegpt.rag")

def retrieve_context(query: str, k: int = 3) -> str:
    """
    Retrieves the top k relevant text chunks matching the query from ChromaDB.
    Returns a unified context string.
    """
    try:
        db = get_vectorstore()
        results = db.similarity_search(query, k=k)
        if not results:
            return ""
        
        # Merge contents
        context_parts = []
        for idx, doc in enumerate(results):
            context_parts.append(f"[Context Fragment #{idx+1}]\n{doc.page_content}")
        return "\n\n".join(context_parts)
    except Exception as e:
        logger.error(f"Error retrieving context from ChromaDB: {e}")
        return ""

def answer_query_with_rag(query: str, k: int = 3) -> str:
    """
    Answers a query utilizing context retrieved from the vector store.
    """
    context = retrieve_context(query, k=k)
    
    # Compose RAG prompt
    if context:
        prompt = (
            "You are CrimeGPT, a professional legal and criminal investigative AI assistant.\n"
            "Answer the user's query utilizing the retrieved context from uploaded legal documents.\n"
            "Structure your answer with clear bold headers, bullet lists, and cite the specific Context Fragment numbers (e.g., [Context Fragment #1]) or Sections (e.g., Section 378 IPC) when referencing details.\n"
            "If the retrieved context is insufficient, state clearly that the uploaded documents do not contain the answer, and provide a general explanation citing standard legal codes (IPC/CrPC/BNS).\n"
            "Do not hallucinate or make up facts.\n\n"
            f"--- START RETRIEVED LEGAL CONTEXT ---\n{context}\n--- END RETRIEVED LEGAL CONTEXT ---\n\n"
            f"User Query: {query}\n\n"
            "Detailed Response:"
        )
    else:
        prompt = (
            "You are CrimeGPT, a professional legal and criminal investigative AI assistant.\n"
            "The user asked a query but there is no legal document context available in the database.\n"
            "Politely inform the user that no legal documents have been uploaded or match this query, and answer "
            "the query based on general Indian legal knowledge (CrPC/IPC/BNS), stating that this is general knowledge "
            "since no custom files are uploaded.\n\n"
            f"User Query: {query}\n\n"
            "Response:"
        )

    return generate_document(prompt)

