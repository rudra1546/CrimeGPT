import os
import logging
from typing import List
from langchain_core.embeddings import Embeddings
from google import genai

logger = logging.getLogger("crimegpt.rag.embeddings")

class GeminiEmbeddings(Embeddings):
    """
    Production Gemini Embeddings implementation using google-genai SDK (text-embedding-004).
    Ultra-lightweight with zero PyTorch, Transformers, or SentenceTransformer dependencies.
    """
    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
        self._client = None

    @property
    def dimension(self) -> int:
        return 768

    def _get_client(self):
        if self._client is None:
            key = os.getenv("GEMINI_API_KEY", "").strip()
            if not key or key.lower() in ["your-gemini-api-key-here", "mock"]:
                logger.warning("[Gemini Embeddings] GEMINI_API_KEY is not configured or in mock mode.")
                return None
            try:
                self._client = genai.Client(api_key=key)
            except Exception as e:
                logger.error(f"[Gemini Embeddings] Failed to initialize genai Client: {e}")
                return None
        return self._client

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of document text chunks using Gemini text-embedding-004 API.
        """
        if not texts:
            return []

        client = self._get_client()
        if not client:
            logger.warning("[Gemini Embeddings] Client unavailable, returning default zero vectors.")
            return [[0.0] * 768 for _ in texts]

        logger.info(f"[Gemini Embeddings] Requesting Gemini embeddings ({self.model_name}) for {len(texts)} text chunks...")
        try:
            all_embeddings = []
            batch_size = 50
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                response = client.models.embed_content(
                    model=self.model_name,
                    contents=batch
                )
                if response and response.embeddings:
                    all_embeddings.extend([e.values for e in response.embeddings])
                else:
                    logger.error(f"[Gemini Embeddings] Empty response for batch starting at index {i}")
                    all_embeddings.extend([[0.0] * 768 for _ in batch])
            logger.info(f"[Gemini Embeddings] Successfully generated {len(all_embeddings)} embedding vectors.")
            return all_embeddings
        except Exception as e:
            logger.error(f"[Gemini Embeddings] Failed to generate document embeddings: {e}")
            return [[0.0] * 768 for _ in texts]

    def embed_query(self, text: str) -> List[float]:
        """
        Embed a single search query text using Gemini text-embedding-004 API.
        """
        if not text or not text.strip():
            return [0.0] * 768

        client = self._get_client()
        if not client:
            logger.warning("[Gemini Embeddings] Client unavailable, returning zero vector.")
            return [0.0] * 768

        try:
            logger.info(f"[Gemini Embeddings] Generating query embedding ({self.model_name})...")
            response = client.models.embed_content(
                model=self.model_name,
                contents=text.strip()
            )
            if response and response.embeddings and len(response.embeddings) > 0:
                return response.embeddings[0].values
            return [0.0] * 768
        except Exception as e:
            logger.error(f"[Gemini Embeddings] Failed to generate query embedding: {e}")
            return [0.0] * 768

# Aliases for clean backward compatibility
LocalEmbeddings = GeminiEmbeddings
