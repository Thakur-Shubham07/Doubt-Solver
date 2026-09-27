from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DoubtRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    lesson_id: str = Field(min_length=1, max_length=100)
    conversation_id: UUID | None = None
    question: str = Field(min_length=1, max_length=10_000)

    @field_validator("question")
    @classmethod
    def reject_blank_question(cls, value: str) -> str:
        if not value:
            raise ValueError("Question must not be blank")
        return value


class SourceReference(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    lesson_id: str = Field(min_length=1, max_length=100)
    source_type: Literal["transcript", "study_material", "video"]
    page: int | None = Field(default=None, ge=1)
    start_sec: float | None = Field(default=None, ge=0)
    end_sec: float | None = Field(default=None, ge=0)
    content: str = Field(min_length=1)


class DoubtResponse(BaseModel):
    conversation_id: UUID
    supported: bool
    answer: str
    sources: list[SourceReference]