from fastapi import APIRouter, Depends, Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ResourceNotFoundError
from app.models.lesson import Lesson
from app.schemas.doubt import SourceReference
from app.schemas.lesson import LessonResponse
from app.services.qdrant_service import QdrantService, get_qdrant_service


router = APIRouter(prefix="/api/lessons", tags=["lessons"])


@router.get("", response_model=list[LessonResponse])
def list_lessons(session: Session = Depends(get_db)) -> list[Lesson]:
    statement = select(Lesson).order_by(Lesson.title, Lesson.id)
    return list(session.scalars(statement).all())


@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson(
    lesson_id: str = Path(min_length=1, max_length=100),
    session: Session = Depends(get_db),
) -> Lesson:
    lesson = session.get(Lesson, lesson_id)
    if lesson is None:
        raise ResourceNotFoundError("Lesson not found")
    return lesson


@router.get("/{lesson_id}/content", response_model=list[SourceReference])
def get_lesson_content(
    lesson_id: str = Path(min_length=1, max_length=100),
    session: Session = Depends(get_db),
    qdrant: QdrantService = Depends(get_qdrant_service),
) -> list[SourceReference]:
    if session.get(Lesson, lesson_id) is None:
        raise ResourceNotFoundError("Lesson not found")
    chunks = qdrant.get_lesson_chunks(lesson_id)
    return [SourceReference.model_validate(chunk) for chunk in chunks]