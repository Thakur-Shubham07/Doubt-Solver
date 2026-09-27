import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.database import SessionLocal, init_db
from app.models.lesson import Lesson
from app.services.lesson_ingestion import (
    LessonIngestionService,
    get_lesson_ingestion_service,
)


LESSON_DATA_PATH = Path(__file__).resolve().parent / "data" / "digestive_system.json"


def ingest_example_lesson(
    session: Session,
    service: LessonIngestionService | None = None,
) -> Lesson:
    lesson_data = json.loads(LESSON_DATA_PATH.read_text(encoding="utf-8"))
    ingestion_service = service or get_lesson_ingestion_service()
    return ingestion_service.ingest_lesson(
        session=session,
        lesson_id=lesson_data["lesson_id"],
        title=lesson_data["title"],
        description=lesson_data["description"],
        video_url=lesson_data["video_url"],
        transcript=lesson_data["transcript"],
        study_material=lesson_data["study_material"],
    )


def main() -> None:
    init_db()
    with SessionLocal() as session:
        lesson = ingest_example_lesson(session)
    print(f"Ingested lesson {lesson.id}: {lesson.title}")


if __name__ == "__main__":
    main()