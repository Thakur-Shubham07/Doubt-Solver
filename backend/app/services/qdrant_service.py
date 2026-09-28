from collections.abc import Mapping, Sequence
from typing import Any
from uuid import uuid4

from qdrant_client import QdrantClient, models

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.schemas.doubt import SourceReference
from app.services.embeddings import EMBEDDING_DIMENSIONS


class QdrantService:
    def __init__(self, client: QdrantClient | None = None) -> None:
        self._client = client

    def _get_client(self) -> QdrantClient:
        if self._client is None:
            api_key = (
                settings.qdrant_api_key.get_secret_value()
                if settings.qdrant_api_key is not None
                else None
            )
            self._client = QdrantClient(url=settings.qdrant_url, api_key=api_key)
        return self._client

    def create_collection(self) -> None:
        try:
            client = self._get_client()
            if not client.collection_exists(settings.qdrant_collection):
                client.create_collection(
                    collection_name=settings.qdrant_collection,
                    vectors_config=models.VectorParams(
                        size=EMBEDDING_DIMENSIONS,
                        distance=models.Distance.COSINE,
                    ),
                )
        except Exception as exc:
            raise ServiceUnavailableError(
                "Qdrant collection is unavailable"
            ) from exc

    def upsert_chunks(
        self,
        chunks: Sequence[Mapping[str, Any]],
        vectors: list[list[float]],
    ) -> list[str]:
        if len(chunks) != len(vectors):
            raise ValueError("Each chunk must have exactly one embedding")
        if not chunks:
            return []

        points: list[models.PointStruct] = []
        point_ids: list[str] = []
        for chunk, vector in zip(chunks, vectors, strict=True):
            if len(vector) != EMBEDDING_DIMENSIONS:
                raise ValueError(
                    f"Embedding vectors must have {EMBEDDING_DIMENSIONS} dimensions"
                )
            source = SourceReference.model_validate(chunk)
            point_id = str(uuid4())
            point_ids.append(point_id)
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=source.model_dump(mode="json"),
                )
            )

        try:
            self._get_client().upsert(
                collection_name=settings.qdrant_collection,
                points=points,
                wait=True,
            )
        except Exception as exc:
            raise ServiceUnavailableError(
                "Qdrant could not store lesson content"
            ) from exc
        return point_ids

    def search_chunks(
        self,
        query_vector: list[float],
        lesson_id: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        if not lesson_id.strip():
            raise ValueError("lesson_id must not be empty")
        if len(query_vector) != EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Query vectors must have {EMBEDDING_DIMENSIONS} dimensions"
            )
        if limit < 1:
            raise ValueError("limit must be greater than zero")

        lesson_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="lesson_id",
                    match=models.MatchValue(value=lesson_id),
                )
            ]
        )
        try:
            response = self._get_client().query_points(
                collection_name=settings.qdrant_collection,
                query=query_vector,
                query_filter=lesson_filter,
                limit=limit,
                with_payload=True,
            )
        except Exception as exc:
            raise ServiceUnavailableError(
                "Qdrant search is unavailable"
            ) from exc

        results: list[dict[str, Any]] = []
        for point in response.points:
            if point.payload is None:
                continue
            source = SourceReference.model_validate(point.payload)
            results.append(source.model_dump(mode="json"))
        return results

    def get_lesson_chunks(self, lesson_id: str) -> list[dict[str, Any]]:
        if not lesson_id.strip():
            raise ValueError("lesson_id must not be empty")

        lesson_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="lesson_id",
                    match=models.MatchValue(value=lesson_id),
                )
            ]
        )
        results: list[dict[str, Any]] = []
        offset = None
        try:
            while True:
                points, next_offset = self._get_client().scroll(
                    collection_name=settings.qdrant_collection,
                    scroll_filter=lesson_filter,
                    limit=100,
                    offset=offset,
                    with_payload=True,
                    with_vectors=False,
                )
                for point in points:
                    if point.payload is None:
                        continue
                    source = SourceReference.model_validate(point.payload)
                    if source.lesson_id == lesson_id:
                        results.append(source.model_dump(mode="json"))
                if next_offset is None:
                    break
                offset = next_offset
        except Exception as exc:
            raise ServiceUnavailableError(
                "Qdrant lesson content is unavailable"
            ) from exc
        return results


qdrant_service = QdrantService()


def get_qdrant_service() -> QdrantService:
    return qdrant_service