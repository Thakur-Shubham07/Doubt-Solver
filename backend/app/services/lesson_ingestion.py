from typing import Any

from pydantic import HttpUrl, TypeAdapter, ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ServiceUnavailableError
from app.models.lesson import Lesson
from app.services.embeddings import EmbeddingService, get_embedding_service
from app.services.qdrant_service import QdrantService, get_qdrant_service
from app.utils.chunking import chunk_text


class LessonIngestionService:
    def __init__(
        self,
        embeddings: EmbeddingService | None = None,
        qdrant: QdrantService | None = None,
        chunk_size: int = 1000,
        chunk_overlap: int = 150,
    ) -> None:
        if chunk_size < 1 or chunk_overlap < 0 or chunk_overlap >= chunk_size:
            raise ValueError("Chunk overlap must be non-negative and smaller than chunk size")
        self._embeddings = embeddings
        self._qdrant = qdrant
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap

    def ingest_lesson(
        self,
        session: Session,
        lesson_id: str,
        title: str,
        description: str,
        video_url: str,
        transcript: str,
        study_material: str,
    ) -> Lesson:
        normalized_id = lesson_id.strip()
        normalized_title = title.strip()
        normalized_description = description.strip()
        if not normalized_id or len(normalized_id) > 100:
            raise AppError(422, "Lesson id must contain between 1 and 100 characters")
        if not normalized_title or len(normalized_title) > 300:
            raise AppError(422, "Lesson title must contain between 1 and 300 characters")
        if not normalized_description:
            raise AppError(422, "Lesson description must not be empty")
        try:
            normalized_video_url = str(TypeAdapter(HttpUrl).validate_python(video_url))
        except ValidationError as exc:
            raise AppError(422, "Lesson video URL is invalid") from exc

        chunks = self._build_chunks(normalized_id, transcript, study_material)
        if not chunks:
            raise AppError(422, "Lesson must contain transcript or study material")

        try:
            vectors = self._embedding_service().embed_texts(
                [chunk["content"] for chunk in chunks]
            )
            qdrant = self._qdrant_service()
            qdrant.create_collection()
            qdrant.upsert_chunks(chunks=chunks, vectors=vectors)

            lesson = session.get(Lesson, normalized_id)
            if lesson is None:
                lesson = Lesson(
                    id=normalized_id,
                    title=normalized_title,
                    description=normalized_description,
                    video_url=normalized_video_url,
                )
                session.add(lesson)
            else:
                lesson.title = normalized_title
                lesson.description = normalized_description
                lesson.video_url = normalized_video_url
            session.commit()
            return lesson
        except SQLAlchemyError as exc:
            session.rollback()
            raise ServiceUnavailableError("Database operation failed") from exc
        except Exception:
            session.rollback()
            raise

    def _build_chunks(
        self, lesson_id: str, transcript: str, study_material: str
    ) -> list[dict[str, Any]]:
        chunks: list[dict[str, Any]] = []
        for source_type, content in (
            ("transcript", transcript),
            ("study_material", study_material),
        ):
            for chunk in chunk_text(
                content,
                chunk_size=self._chunk_size,
                overlap=self._chunk_overlap,
            ):
                chunks.append(
                    {
                        "lesson_id": lesson_id,
                        "source_type": source_type,
                        "page": None,
                        "start_sec": None,
                        "end_sec": None,
                        "content": chunk,
                    }
                )
        return chunks

    def _embedding_service(self) -> EmbeddingService:
        return self._embeddings or get_embedding_service()

    def _qdrant_service(self) -> QdrantService:
        return self._qdrant or get_qdrant_service()


lesson_ingestion_service = LessonIngestionService()


def get_lesson_ingestion_service() -> LessonIngestionService:
    return lesson_ingestion_service