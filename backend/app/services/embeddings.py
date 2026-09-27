from typing import cast

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError


EMBEDDING_DIMENSIONS = 768


class EmbeddingService:
    def __init__(self, client: genai.Client | None = None) -> None:
        self._client = client

    def _get_client(self) -> genai.Client:
        if self._client is None:
            if settings.gemini_api_key is None:
                raise ServiceUnavailableError("Gemini API is not configured")
            self._client = genai.Client(
                api_key=settings.gemini_api_key.get_secret_value()
            )
        return self._client

    def embed_text(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        normalized_texts = [text.strip() for text in texts]
        if any(not text for text in normalized_texts):
            raise ValueError("Embedding input must not be empty")
        if not normalized_texts:
            return []

        try:
            response = self._get_client().models.embed_content(
                model=settings.gemini_embedding_model,
                contents=normalized_texts,
                config=types.EmbedContentConfig(
                    output_dimensionality=EMBEDDING_DIMENSIONS
                ),
            )
            embeddings = response.embeddings or []
            if len(embeddings) != len(normalized_texts):
                raise ServiceUnavailableError(
                    "Gemini returned an unexpected number of embeddings"
                )

            vectors: list[list[float]] = []
            for embedding in embeddings:
                values = embedding.values
                if values is None or len(values) != EMBEDDING_DIMENSIONS:
                    raise ServiceUnavailableError(
                        "Gemini returned an embedding with an unexpected dimension"
                    )
                vectors.append([float(value) for value in cast(list[float], values)])
            return vectors
        except ServiceUnavailableError:
            raise
        except Exception as exc:
            raise ServiceUnavailableError(
                "Gemini embedding service is unavailable"
            ) from exc


embedding_service = EmbeddingService()


def get_embedding_service() -> EmbeddingService:
    return embedding_service