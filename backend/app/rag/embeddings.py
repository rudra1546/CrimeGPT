import hashlib
import random
import logging
from langchain_core.embeddings import Embeddings
from app.ai.gemini import client, IS_MOCK

logger = logging.getLogger("crimegpt.rag")

class GeminiEmbeddings(Embeddings):
    """
    Custom LangChain Embeddings implementation using the Google Gemini API (text-embedding-004).
    If GEMINI_API_KEY is not configured, generates deterministic mock embedding vectors
    for development and testing purposes.
    """
    def __init__(self, dimension: int = 768):
        self.dimension = dimension

    def _generate_mock_vector(self, text: str) -> list[float]:
        """
        Generates a deterministic pseudo-random float vector based on the SHA256 hash of the text.
        """
        sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
        seed = int(sha, 16) % (2**32)
        rng = random.Random(seed)
        return [rng.uniform(-1.0, 1.0) for _ in range(self.dimension)]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """
        Embed a list of documents.
        """
        if IS_MOCK or client is None:
            logger.warning("Mocking embeddings for documents (Gemini API key not configured).")
            return [self._generate_mock_vector(text) for text in texts]
        
        try:
            # Batch request embeddings from Gemini API
            response = client.models.embed_content(
                model="text-embedding-004",
                contents=texts
            )
            return [embedding.values for embedding in response.embeddings]
        except Exception as e:
            logger.error(f"Failed to generate Gemini embeddings for documents: {e}. Falling back to mock vectors.")
            return [self._generate_mock_vector(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        """
        Embed a single search query.
        """
        if IS_MOCK or client is None:
            logger.warning("Mocking embedding for query (Gemini API key not configured).")
            return self._generate_mock_vector(text)

        try:
            # Request embedding for a single query text
            response = client.models.embed_content(
                model="text-embedding-004",
                contents=[text]
            )
            return response.embeddings[0].values
        except Exception as e:
            logger.error(f"Failed to generate Gemini embedding for query: {e}. Falling back to mock vector.")
            return self._generate_mock_vector(text)
