from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import AppError, ResourceNotFoundError, ServiceUnavailableError
from app.models.conversation import Conversation
from app.models.doubt import Doubt
from app.models.lesson import Lesson
from app.schemas.doubt import DoubtResponse, SourceReference
from app.services.embeddings import EmbeddingService, get_embedding_service
from app.services.gemini_service import GeminiService, get_gemini_service
from app.services.qdrant_service import QdrantService, get_qdrant_service


class RagService:
    def __init__(
        self,
        embeddings: EmbeddingService | None = None,
        qdrant: QdrantService | None = None,
        gemini: GeminiService | None = None,
    ) -> None:
        self._embeddings = embeddings
        self._qdrant = qdrant
        self._gemini = gemini

    def answer_question(
        self,
        session: Session,
        lesson_id: str,
        question: str,
        conversation_id: UUID | str | None = None,
    ) -> DoubtResponse:
        lesson = session.get(Lesson, lesson_id)
        if lesson is None:
            raise ResourceNotFoundError("Lesson not found")

        if conversation_id is None:
            conversation = Conversation(lesson_id=lesson_id)
            session.add(conversation)
            session.flush()
        else:
            try:
                normalized_conversation_id = str(UUID(str(conversation_id)))
            except ValueError as exc:
                raise AppError(422, "Invalid conversation id") from exc
            conversation = session.get(Conversation, normalized_conversation_id)
            if conversation is None:
                raise ResourceNotFoundError("Conversation not found for this lesson")
            if conversation.lesson_id != lesson_id:
                raise ResourceNotFoundError("Conversation not found for this lesson")

        try:
            vector = self._embedding_service().embed_text(question)
            retrieved_sources = self._qdrant_service().search_chunks(
                query_vector=vector,
                lesson_id=lesson_id,
            )
            safe_sources = [
                source
                for source in retrieved_sources
                if source.get("lesson_id") == lesson_id
            ]
            history = self._load_history(session, conversation.id)
            generated = self._gemini_service().generate_answer(
                question=question,
                sources=safe_sources,
                history=history,
            )
            sources = [SourceReference.model_validate(source) for source in safe_sources]

            doubt = Doubt(
                lesson_id=lesson_id,
                conversation_id=conversation.id,
                question=question,
                answer=generated.answer,
                supported=generated.supported,
            )
            session.add(doubt)
            session.commit()
            return DoubtResponse(
                conversation_id=UUID(conversation.id),
                supported=generated.supported,
                answer=generated.answer,
                sources=sources,
            )
        except SQLAlchemyError as exc:
            session.rollback()
            raise ServiceUnavailableError("Database operation failed") from exc
        except Exception:
            session.rollback()
            raise

    @staticmethod
    def _load_history(
        session: Session, conversation_id: str
    ) -> list[dict[str, str]]:
        doubts = session.scalars(
            select(Doubt)
            .where(Doubt.conversation_id == conversation_id)
            .order_by(Doubt.created_at, Doubt.id)
        ).all()
        history: list[dict[str, str]] = []
        for doubt in doubts:
            history.append({"role": "user", "content": doubt.question})
            history.append({"role": "model", "content": doubt.answer})
        return history

    def _embedding_service(self) -> EmbeddingService:
        return self._embeddings or get_embedding_service()

    def _qdrant_service(self) -> QdrantService:
        return self._qdrant or get_qdrant_service()

    def _gemini_service(self) -> GeminiService:
        return self._gemini or get_gemini_service()


rag_service = RagService()


def get_rag_service() -> RagService:
    return rag_service