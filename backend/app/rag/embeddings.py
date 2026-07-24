import os
import logging
from langchain_core.embeddings import Embeddings

logger = logging.getLogger("crimegpt.rag.embeddings")

_LOCAL_TRANSFORMER_MODEL = None

def get_sentence_transformer_model():
    """
    Loads the local SentenceTransformer embedding model once during application execution.
    Prevents reloading the model on every upload or query request.
    """
    global _LOCAL_TRANSFORMER_MODEL
    if _LOCAL_TRANSFORMER_MODEL is None:
        model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
        logger.info(f"[Local Embeddings] Initializing SentenceTransformer model '{model_name}'...")
        try:
            from sentence_transformers import SentenceTransformer
            _LOCAL_TRANSFORMER_MODEL = SentenceTransformer(model_name)
            logger.info(f"[Local Embeddings] Successfully loaded local embedding model '{model_name}'.")
        except Exception as e:
            logger.error(f"[Local Embeddings] Failed loading SentenceTransformer '{model_name}': {e}")
            raise e
    return _LOCAL_TRANSFORMER_MODEL

class LocalEmbeddings(Embeddings):
    """
    Local SentenceTransformers Embeddings implementation (BAAI/bge-small-en-v1.5).
    Runs completely offline with zero external API calls or Gemini dependencies.
    """
    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
        self._dim = None

    @property
    def dimension(self) -> int:
        if self._dim is None:
            model = get_sentence_transformer_model()
            self._dim = getattr(model, "get_embedding_dimension", lambda: 384)()
        return self._dim

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a list of document text chunks locally using SentenceTransformers.
        """
        if not texts:
            return []

        logger.info(f"[Local Embeddings] Generating local embeddings for {len(texts)} chunks...")
        model = get_sentence_transformer_model()
        vectors = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        logger.info(f"[Local Embeddings] Successfully generated {len(vectors)} local embedding vectors.")
        return vectors.tolist()

    def embed_query(self, text: str) -> list[float]:
        """
        Embed a single search query locally using SentenceTransformers.
        """
        if not text or not text.strip():
            return [0.0] * self.dimension

        logger.info(f"[Local Embeddings] Generating local query embedding...")
        model = get_sentence_transformer_model()
        vector = model.encode(text.strip(), show_progress_bar=False, normalize_embeddings=True)
        return vector.tolist()

# Alias for backward compatibility
GeminiEmbeddings = LocalEmbeddings
