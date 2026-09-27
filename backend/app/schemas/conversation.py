from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(min_length=1, max_length=36)
    lesson_id: str = Field(min_length=1, max_length=100)
    created_at: datetime