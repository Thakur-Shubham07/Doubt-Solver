from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.doubt import DoubtRequest, DoubtResponse
from app.services.rag_service import RagService, get_rag_service


router = APIRouter(prefix="/api/doubts", tags=["doubts"])


@router.post("", response_model=DoubtResponse)
def create_doubt(
    request: DoubtRequest,
    session: Session = Depends(get_db),
    service: RagService = Depends(get_rag_service),
) -> DoubtResponse:
    return service.answer_question(
        session=session,
        lesson_id=request.lesson_id,
        question=request.question,
        conversation_id=request.conversation_id,
    )