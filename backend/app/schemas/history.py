from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DoubtHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lesson_id: str = Field(min_length=1, max_length=100)
    conversation_id: UUID
    question: str
    answer: str
    supported: bool
    created_at: datetime