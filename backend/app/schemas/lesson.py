from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class LessonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=300)
    description: str
    video_url: HttpUrl
    created_at: datetime