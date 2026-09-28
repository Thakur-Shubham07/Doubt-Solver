export type Lesson = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  created_at: string;
};

export type SourceReference = {
  lesson_id: string;
  source_type: "transcript" | "study_material" | "video";
  page: number | null;
  start_sec: number | null;
  end_sec: number | null;
  content: string;
};

export type DoubtResult = {
  conversation_id: string;
  supported: boolean;
  answer: string;
  sources: SourceReference[];
};

export type DoubtHistory = {
  id: string;
  lesson_id: string;
  conversation_id: string;
  question: string;
  answer: string;
  supported: boolean;
  created_at: string;
};

type AskDoubtRequest = {
  lesson_id: string;
  conversation_id?: string;
  question: string;
};

const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${configuredApiUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error(
      "Could not reach the backend. Check that the API is running.",
    );
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const detail =
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof payload.detail === "string"
        ? payload.detail
        : `Request failed (${response.status})`;
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function fetchLessons() {
  return request<Lesson[]>("/api/lessons");
}

export function fetchLessonContent(lessonId: string) {
  return request<SourceReference[]>(
    `/api/lessons/${encodeURIComponent(lessonId)}/content`,
  );
}

export function fetchHistory(lessonId: string) {
  return request<DoubtHistory[]>(
    `/api/history/${encodeURIComponent(lessonId)}`,
  );
}

export function askDoubt(payload: AskDoubtRequest) {
  return request<DoubtResult>("/api/doubts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
