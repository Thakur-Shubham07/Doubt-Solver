import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.database import SessionLocal, init_db
from app.models.lesson import Lesson
from app.services.lesson_ingestion import (
    LessonIngestionService,
    get_lesson_ingestion_service,
)


LESSON_DATA_DIR = Path(__file__).resolve().parent / "data"
LESSON_DATA_PATH = LESSON_DATA_DIR / "digestive_system.json"


def ingest_lesson_file(
    session: Session,
    lesson_path: Path,
    service: LessonIngestionService | None = None,
) -> Lesson:
    lesson_data = json.loads(lesson_path.read_text(encoding="utf-8"))
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


def ingest_example_lesson(
    session: Session,
    service: LessonIngestionService | None = None,
) -> Lesson:
    return ingest_lesson_file(
        session=session,
        lesson_path=LESSON_DATA_PATH,
        service=service,
    )


def ingest_lessons_from_directory(
    session: Session,
    directory: Path = LESSON_DATA_DIR,
    service: LessonIngestionService | None = None,
) -> list[Lesson]:
    lesson_paths = sorted(directory.glob("*.json"))
    if not lesson_paths:
        raise FileNotFoundError(f"No lesson JSON files found in {directory}")
    return [
        ingest_lesson_file(session, lesson_path, service)
        for lesson_path in lesson_paths
    ]


def main() -> None:
    init_db()
    with SessionLocal() as session:
        lessons = ingest_lessons_from_directory(session)
    for lesson in lessons:
        print(f"Ingested lesson {lesson.id}: {lesson.title}")


if __name__ == "__main__":
    main()