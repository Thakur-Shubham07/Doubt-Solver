def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
    if chunk_size < 1:
        raise ValueError("chunk_size must be greater than zero")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be non-negative and smaller than chunk_size")

    normalized_text = " ".join(text.split())
    if not normalized_text:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(normalized_text):
        end = min(start + chunk_size, len(normalized_text))
        if end < len(normalized_text):
            boundary = normalized_text.rfind(" ", start + chunk_size // 2, end)
            if boundary > start:
                end = boundary

        chunks.append(normalized_text[start:end].strip())
        if end == len(normalized_text):
            break

        next_start = max(start + 1, end - overlap)
        while next_start > start and not normalized_text[next_start - 1].isspace():
            next_start -= 1
        start = next_start if next_start > start else end

    return chunks