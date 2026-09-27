from fastapi import APIRouter, Depends, Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import ResourceNotFoundError
from app.models.doubt import Doubt
from app.models.lesson import Lesson
from app.schemas.history import DoubtHistoryItem


router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/{lesson_id}", response_model=list[DoubtHistoryItem])
def get_lesson_history(
    lesson_id: str = Path(min_length=1, max_length=100),
    session: Session = Depends(get_db),
) -> list[Doubt]:
    if session.get(Lesson, lesson_id) is None:
        raise ResourceNotFoundError("Lesson not found")

    statement = (
        select(Doubt)
        .where(Doubt.lesson_id == lesson_id)
        .order_by(Doubt.created_at, Doubt.id)
    )
    return list(session.scalars(statement).all())