import os
import time
import logging
from typing import List
from langchain_core.embeddings import Embeddings
from google import genai

logger = logging.getLogger("crimegpt.rag.embeddings")

class GeminiEmbeddings(Embeddings):
    """
    Production Gemini Embeddings implementation using google-genai SDK (gemini-embedding-001).
    Ultra-lightweight with zero PyTorch, Transformers, or SentenceTransformer dependencies.
    """
    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
        self._client = None

    @property
    def dimension(self) -> int:
        return 3072

    def _get_client(self):
        if self._client is None:
            key = os.getenv("GEMINI_API_KEY", "").strip()
            if not key or key.lower() in ["your-gemini-api-key-here", "mock"]:
                raise Exception("[Gemini Embeddings] GEMINI_API_KEY is missing or unconfigured.")
            self._client = genai.Client(api_key=key)

        return self._client

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of document text chunks using Gemini gemini-embedding-001 API.
        """
        if not texts:
            return []

        client = self._get_client()

        logger.info(f"[Gemini Embeddings] Requesting Gemini embeddings ({self.model_name}) for {len(texts)} text chunks...")
        all_embeddings = []
        batch_size = 50

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            max_retries = 3
            success = False

            for attempt in range(1, max_retries + 1):
                try:
                    response = client.models.embed_content(
                        model=self.model_name,
                        contents=batch
                    )
                    if response and response.embeddings:
                        all_embeddings.extend([e.values for e in response.embeddings])
                        time.sleep(0.5)  # Added delay to respect rate limits
                        success = True
                        break
                    else:
                        raise Exception(f"Empty or invalid response from Gemini API for batch starting at index {i}")
                except Exception as e:
                    err_msg = str(e)
                    if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                        if attempt < max_retries:
                            logger.warning(
                                f"[Gemini Embeddings] Rate limit (429) hit on batch starting at index {i} (attempt {attempt}/{max_retries}). Waiting 45 seconds..."
                            )
                            time.sleep(45)
                            continue
                    logger.error(f"[Gemini Embeddings] Failed batch starting at index {i} after attempt {attempt}: {e}")
                    raise e

            if not success:
                raise Exception(f"[Gemini Embeddings] Failed to embed batch starting at index {i} after {max_retries} retries.")

        logger.info(f"[Gemini Embeddings] Successfully generated {len(all_embeddings)} embedding vectors.")
        return all_embeddings

    def embed_query(self, text: str) -> List[float]:
        """
        Embed a single search query text using Gemini gemini-embedding-001 API.
        """
        if not text or not text.strip():
            return [0.0] * 3072

        client = self._get_client()

        logger.info(f"[Gemini Embeddings] Generating query embedding ({self.model_name})...")
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                response = client.models.embed_content(
                    model=self.model_name,
                    contents=text.strip()
                )
                if response and response.embeddings and len(response.embeddings) > 0:
                    return response.embeddings[0].values
                raise Exception("Empty or invalid response from Gemini API for query embedding")
            except Exception as e:
                err_msg = str(e)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    if attempt < max_retries:
                        logger.warning(
                            f"[Gemini Embeddings] Rate limit (429) hit on query embedding (attempt {attempt}/{max_retries}). Waiting 45 seconds..."
                        )
                        time.sleep(45)
                        continue
                logger.error(f"[Gemini Embeddings] Failed to generate query embedding: {e}")
                raise e

        raise Exception(f"[Gemini Embeddings] Failed to generate query embedding after {max_retries} retries.")

# Aliases for clean backward compatibility
LocalEmbeddings = GeminiEmbeddings
