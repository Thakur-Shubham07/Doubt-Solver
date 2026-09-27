from collections.abc import Iterable, Mapping
from typing import Any

from app.schemas.doubt import SourceReference


def format_source(payload: Mapping[str, Any]) -> SourceReference:
    source_fields = {
        "lesson_id": payload.get("lesson_id"),
        "source_type": payload.get("source_type"),
        "page": payload.get("page"),
        "start_sec": payload.get("start_sec"),
        "end_sec": payload.get("end_sec"),
        "content": payload.get("content"),
    }
    return SourceReference.model_validate(source_fields)


def format_sources(payloads: Iterable[Mapping[str, Any]]) -> list[SourceReference]:
    return [format_source(payload) for payload in payloads]