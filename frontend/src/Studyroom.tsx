import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  History,
  LoaderCircle,
  MessageCircle,
  PanelLeftClose,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  askDoubt,
  fetchHistory,
  fetchLessonContent,
  fetchLessons,
  type DoubtHistory,
  type DoubtResult,
  type Lesson,
} from "@/lib/api";
import "./Studyroom.css";

type Message = {
  role: "user" | "assistant";
  text: string;
  supported?: boolean;
  sources?: DoubtResult["sources"];
};

export default function Studyroom() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [history, setHistory] = useState<DoubtHistory[]>([]);
  const [lessonContent, setLessonContent] = useState<DoubtResult["sources"]>(
    [],
  );
  const [materialTab, setMaterialTab] = useState<
    "study_material" | "transcript"
  >("study_material");
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState("");
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingContent, setLoadingContent] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetchLessons()
      .then((items) => {
        if (!active) return;
        setLessons(items);
        setSelectedLesson(items[0] ?? null);
        setApiConnected(true);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(getErrorMessage(reason));
          setApiConnected(false);
        }
      })
      .finally(() => {
        if (active) setLoadingLessons(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedLesson) return;

    let active = true;
    fetchHistory(selectedLesson.id)
      .then((items) => {
        if (!active) return;
        setHistory(items);
        const latestConversationId = items.at(-1)?.conversation_id ?? null;
        setConversationId(latestConversationId);
        setMessages(
          latestConversationId
            ? items
                .filter((item) => item.conversation_id === latestConversationId)
                .flatMap(historyItemToMessages)
            : [],
        );
      })
      .catch((reason: unknown) => {
        if (active) {
          setHistory([]);
          setMessages([]);
          setConversationId(null);
          setError(getErrorMessage(reason));
        }
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, [selectedLesson]);

  useEffect(() => {
    if (!selectedLesson) return;

    let active = true;
    fetchLessonContent(selectedLesson.id)
      .then((items) => {
        if (active) setLessonContent(items);
      })
      .catch((reason: unknown) => {
        if (active) {
          setLessonContent([]);
          setContentError(getErrorMessage(reason));
        }
      })
      .finally(() => {
        if (active) setLoadingContent(false);
      });

    return () => {
      active = false;
    };
  }, [selectedLesson]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const filteredLessons = lessons.filter((lesson) =>
    `${lesson.title} ${lesson.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const videoEmbedUrl = selectedLesson
    ? getYouTubeEmbedUrl(selectedLesson.video_url)
    : null;

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!selectedLesson || !trimmedQuestion || sending) return;

    setError(null);
    setQuestion("");
    setMessages((current) => [
      ...current,
      { role: "user", text: trimmedQuestion },
    ]);
    setSending(true);
    try {
      const result = await askDoubt({
        lesson_id: selectedLesson.id,
        conversation_id: conversationId ?? undefined,
        question: trimmedQuestion,
      });
      setConversationId(result.conversation_id);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: result.answer,
          supported: result.supported,
          sources: result.sources,
        },
      ]);
      setHistory(await fetchHistory(selectedLesson.id));
      setApiConnected(true);
    } catch (reason) {
      setError(getErrorMessage(reason));
      setApiConnected(false);
    } finally {
      setSending(false);
    }
  }

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setShowHistory(false);
    setError(null);
  }

  function selectHistoryConversation(item: DoubtHistory) {
    setConversationId(item.conversation_id);
    setMessages(
      history
        .filter((turn) => turn.conversation_id === item.conversation_id)
        .flatMap(historyItemToMessages),
    );
    setShowHistory(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Studyroom home">
          <span className="brand-mark">
            <GraduationCap size={19} strokeWidth={2.2} />
          </span>
          <span>studyroom</span>
        </a>
        <div className="topbar-center">
          <span>My learning</span>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
        <div className="topbar-actions">
          <span
            className={`connection-status ${apiConnected ? "connected" : ""}`}
          >
            <span /> {apiConnected ? "API connected" : "API offline"}
          </span>
          <button className="avatar" type="button" aria-label="Account">
            S
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="lesson-sidebar" aria-label="Lesson navigation">
          <div className="sidebar-heading">
            <div>
              <span className="eyebrow">YOUR LIBRARY</span>
              <h2>Lessons</h2>
            </div>
            <button
              className="icon-button subtle"
              type="button"
              title="Lesson list"
              aria-label="Lesson list"
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
          <label className="lesson-search">
            <Search size={15} />
            <input
              aria-label="Search lessons"
              placeholder="Find a lesson"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="library-label">
            <span>ALL LESSONS</span>
            <span>{lessons.length}</span>
          </div>
          <nav className="lesson-list">
            {loadingLessons ? (
              <div className="sidebar-loading">
                <LoaderCircle className="spin" size={17} /> Loading lessons
              </div>
            ) : filteredLessons.length ? (
              filteredLessons.map((lesson, index) => (
                <button
                  className={`lesson-nav-item ${selectedLesson?.id === lesson.id ? "selected" : ""}`}
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    setLoadingHistory(true);
                    setLoadingContent(true);
                    setError(null);
                    setContentError(null);
                    setSelectedLesson(lesson);
                    setMobileChatOpen(false);
                  }}
                >
                  <span className={`lesson-index index-${index % 3}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="lesson-nav-copy">
                    <span>{lesson.title}</span>
                    <small>{lesson.description}</small>
                  </span>
                  {selectedLesson?.id === lesson.id && (
                    <span className="selected-dot" />
                  )}
                </button>
              ))
            ) : (
              <div className="empty-lessons">
                {lessons.length
                  ? "No lessons match your search."
                  : "No lessons are available yet."}
              </div>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="streak-note">
              <span className="streak-icon">
                <Sparkles size={16} />
              </span>
              <span>
                <strong>Keep your curiosity</strong>
                <small>One question at a time.</small>
              </span>
            </div>
            <button
              className="sidebar-link"
              type="button"
              onClick={() => setShowHistory((current) => !current)}
            >
              <History size={16} /> Doubt history <ArrowRight size={14} />
            </button>
          </div>
        </aside>

        <main className="lesson-main">
          {selectedLesson ? (
            <>
              <div className="lesson-toolbar">
                <div className="breadcrumb">
                  <span>My learning</span>
                  <ArrowRight size={13} />
                  <span className="breadcrumb-current">
                    {selectedLesson.title}
                  </span>
                </div>
                <button
                  className="share-button"
                  type="button"
                  onClick={() =>
                    void navigator.clipboard?.writeText(window.location.href)
                  }
                  title="Copy lesson link"
                >
                  <ExternalLink size={15} />
                  <span>Share</span>
                </button>
              </div>
              <section className="lesson-content">
                <div className="lesson-kicker">
                  <span className="kicker-icon">
                    <BookOpen size={14} />
                  </span>{" "}
                  LESSON NOTES <span className="kicker-line" />
                </div>
                <h1>{selectedLesson.title}</h1>
                <p className="lesson-description">
                  {selectedLesson.description}
                </p>
                <div className="lesson-meta">
                  <span>
                    <Clock3 size={14} /> Self paced
                  </span>
                  <span className="meta-divider" />
                  <span>
                    <FileText size={14} /> Lesson material
                  </span>
                  <span className="meta-spacer" />
                  <span className="saved-label">
                    <Check size={13} /> In your library
                  </span>
                </div>

                <div className="lesson-resource">
                  <div className="resource-heading">
                    <div>
                      <span className="eyebrow">WATCH & LEARN</span>
                      <h2>Lesson video</h2>
                    </div>
                    <span className="player-label">
                      <span /> PLAYING HERE
                    </span>
                  </div>
                  <div className="video-frame">
                    {videoEmbedUrl ? (
                      <iframe
                        src={videoEmbedUrl}
                        title={`${selectedLesson.title} lesson video`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : (
                      <div className="video-unavailable" role="status">
                        <Video size={22} />
                        <strong>Video unavailable</strong>
                        <span>
                          Add a valid YouTube video URL to this lesson to play
                          it here.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <section
                  className="materials-section"
                  aria-labelledby="materials-title"
                >
                  <div className="materials-heading">
                    <div>
                      <span className="eyebrow">READ THE SOURCE</span>
                      <h2 id="materials-title">Lesson material</h2>
                    </div>
                    <span className="materials-count">
                      {lessonContent.length}{" "}
                      {lessonContent.length === 1 ? "section" : "sections"}
                    </span>
                  </div>
                  <div
                    className="material-tabs"
                    role="tablist"
                    aria-label="Lesson content type"
                  >
                    <button
                      id="study-material-tab"
                      type="button"
                      role="tab"
                      aria-selected={materialTab === "study_material"}
                      aria-controls="lesson-material-panel"
                      className={
                        materialTab === "study_material" ? "active" : ""
                      }
                      onClick={() => setMaterialTab("study_material")}
                    >
                      <FileText size={15} /> Study material
                    </button>
                    <button
                      id="transcript-tab"
                      type="button"
                      role="tab"
                      aria-selected={materialTab === "transcript"}
                      aria-controls="lesson-material-panel"
                      className={materialTab === "transcript" ? "active" : ""}
                      onClick={() => setMaterialTab("transcript")}
                    >
                      <Video size={15} /> Transcript
                    </button>
                  </div>
                  <div
                    className="material-panel"
                    id="lesson-material-panel"
                    role="tabpanel"
                    aria-labelledby={
                      materialTab === "study_material"
                        ? "study-material-tab"
                        : "transcript-tab"
                    }
                  >
                    {loadingContent ? (
                      <div className="material-state">
                        <LoaderCircle className="spin" size={16} /> Loading
                        lesson content
                      </div>
                    ) : contentError ? (
                      <div
                        className="material-state material-error"
                        role="alert"
                      >
                        {contentError}
                      </div>
                    ) : lessonContent.filter(
                        (item) => item.source_type === materialTab,
                      ).length ? (
                      lessonContent
                        .filter((item) => item.source_type === materialTab)
                        .map((item, index) => (
                          <article
                            className="material-chunk"
                            key={`${item.source_type}-${index}`}
                          >
                            <div className="material-chunk-meta">
                              <span>
                                {materialTab === "study_material"
                                  ? "STUDY MATERIAL"
                                  : "VIDEO TRANSCRIPT"}
                              </span>
                              <span>
                                {formatSourceLocation(
                                  item.page,
                                  item.start_sec,
                                  item.end_sec,
                                )}
                              </span>
                            </div>
                            <p>{item.content}</p>
                          </article>
                        ))
                    ) : (
                      <div className="material-state">
                        No{" "}
                        {materialTab === "study_material"
                          ? "study material"
                          : "transcript"}{" "}
                        is available for this lesson.
                      </div>
                    )}
                  </div>
                </section>

                <section className="notes-section">
                  <div className="notes-heading">
                    <div>
                      <span className="eyebrow">THE ESSENTIALS</span>
                      <h2>Lesson overview</h2>
                    </div>
                    <span className="notes-count">01 / 01</span>
                  </div>
                  <div className="overview-block">
                    <span className="overview-rule" />
                    <p>{selectedLesson.description}</p>
                  </div>
                  <div className="note-callout">
                    <span className="callout-icon">
                      <MessageCircle size={17} />
                    </span>
                    <p>
                      <strong>Something unclear?</strong> Ask the tutor about
                      this lesson. Answers are grounded in the learning
                      material.
                    </p>
                    <button
                      type="button"
                      className="callout-action"
                      onClick={() => setMobileChatOpen(true)}
                      aria-label="Ask the tutor"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="lesson-footer-nav">
                    <button type="button" disabled>
                      Previous lesson
                    </button>
                    <button type="button" disabled>
                      Next lesson <ArrowRight size={14} />
                    </button>
                  </div>
                </section>
              </section>
            </>
          ) : (
            <div className="no-lesson-state">
              <span>
                <BookOpen size={24} />
              </span>
              <h1>
                {loadingLessons
                  ? "Loading your lessons"
                  : "Your learning space is ready"}
              </h1>
              <p>
                {loadingLessons
                  ? "Connecting to your library…"
                  : (error ?? "Add a lesson to begin exploring.")}
              </p>
            </div>
          )}
        </main>

        <aside
          className={`tutor-panel ${mobileChatOpen ? "mobile-open" : ""}`}
          aria-label="AI tutor"
        >
          <div className="tutor-header">
            <div className="tutor-title-wrap">
              <span className="tutor-avatar">
                <Sparkles size={17} />
              </span>
              <div>
                <h2>Lesson tutor</h2>
                <span>
                  <i /> Grounded in your material
                </span>
              </div>
            </div>
            <div className="tutor-header-actions">
              <button
                className={`icon-button ${showHistory ? "active" : ""}`}
                type="button"
                title="Show doubt history"
                aria-label="Show doubt history"
                onClick={() => setShowHistory((current) => !current)}
              >
                <History size={17} />
              </button>
              <button
                className="icon-button"
                type="button"
                title="New conversation"
                aria-label="New conversation"
                onClick={startNewConversation}
              >
                <Plus size={18} />
              </button>
              <button
                className="icon-button mobile-chat-close"
                type="button"
                title="Close tutor"
                aria-label="Close tutor"
                onClick={() => setMobileChatOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {showHistory ? (
            <div className="history-view">
              <div className="history-title">
                <div>
                  <span className="eyebrow">YOUR QUESTIONS</span>
                  <h3>Doubt history</h3>
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setShowHistory(false)}
                >
                  Back to tutor
                </button>
              </div>
              {history.length ? (
                [...history].reverse().map((item) => (
                  <button
                    className="history-item"
                    key={item.id}
                    type="button"
                    onClick={() => selectHistoryConversation(item)}
                  >
                    <span
                      className={`history-status ${item.supported ? "supported" : ""}`}
                    />
                    <span>
                      <strong>{item.question}</strong>
                      <small>
                        {formatDate(item.created_at)} ·{" "}
                        {item.supported
                          ? "Answered from lesson"
                          : "Not in lesson material"}
                      </small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))
              ) : (
                <div className="history-empty">
                  <MessageCircle size={22} />
                  <p>Your questions will appear here.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="chat-context">
                <span className="context-dot" /> ASKING ABOUT{" "}
                <strong>{selectedLesson?.title ?? "No lesson selected"}</strong>
              </div>
              <div className="chat-messages" aria-live="polite">
                {loadingHistory ? (
                  <div className="chat-loading">
                    <LoaderCircle className="spin" size={17} /> Loading
                    conversation
                  </div>
                ) : messages.length ? (
                  <>
                    <div className="conversation-date">
                      <span /> RECENT CONVERSATION <span />
                    </div>
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={`${index}-${message.role}`}
                        message={message}
                      />
                    ))}
                  </>
                ) : (
                  <div className="tutor-welcome">
                    <div className="welcome-mark">
                      <Sparkles size={20} />
                    </div>
                    <span className="eyebrow">
                      A STUDY PARTNER, NOT A SEARCH ENGINE
                    </span>
                    <h3>Let’s work through it.</h3>
                    <p>
                      Ask anything about this lesson. I’ll use the material here
                      and show you where each answer comes from.
                    </p>
                    <div className="suggestion-label">TRY ASKING</div>
                    <button
                      className="suggestion"
                      type="button"
                      onClick={() =>
                        setQuestion("Can you summarize the main ideas?")
                      }
                    >
                      Can you summarize the main ideas? <ArrowRight size={14} />
                    </button>
                    <button
                      className="suggestion"
                      type="button"
                      onClick={() =>
                        setQuestion("What part should I focus on?")
                      }
                    >
                      What part should I focus on? <ArrowRight size={14} />
                    </button>
                  </div>
                )}
                {sending && (
                  <div className="thinking-row">
                    <span className="thinking-icon">
                      <Sparkles size={15} />
                    </span>
                    <span className="thinking-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>Looking through the lesson</span>
                  </div>
                )}
                {error && (
                  <div className="inline-error" role="alert">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      aria-label="Dismiss error"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>
              <div className="composer-area">
                <div className="composer-hint">
                  <span>
                    <Check size={12} /> Lesson-only answers
                  </span>
                  <span>Enter to send</span>
                </div>
                <form className="composer" onSubmit={submitQuestion}>
                  <textarea
                    aria-label="Ask a question about the lesson"
                    placeholder="Ask a question about this lesson…"
                    value={question}
                    maxLength={10000}
                    rows={2}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    disabled={!selectedLesson || sending || loadingHistory}
                  />
                  <div className="composer-controls">
                    <span>Shift + Enter for a new line</span>
                    <Button
                      type="submit"
                      size="icon"
                      aria-label="Send question"
                      disabled={
                        !question.trim() ||
                        !selectedLesson ||
                        sending ||
                        loadingHistory
                      }
                    >
                      {sending ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Send size={16} />
                      )}
                    </Button>
                  </div>
                </form>
                <p className="privacy-note">
                  Answers are generated from the selected lesson’s material.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
      <button
        className="mobile-chat-trigger"
        type="button"
        onClick={() => setMobileChatOpen(true)}
      >
        <MessageCircle size={17} /> Ask the tutor
      </button>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="message user-message">
        <span className="message-avatar user-avatar">S</span>
        <div className="message-body">
          <span className="message-label">YOU</span>
          <p>{message.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message assistant-message">
      <span className="message-avatar assistant-avatar">
        <Sparkles size={14} />
      </span>
      <div className="message-body">
        <div className="assistant-message-head">
          <span className="message-label">LESSON TUTOR</span>
          <span
            className={`grounding-badge ${message.supported ? "is-supported" : ""}`}
          >
            {message.supported ? (
              <>
                <Check size={11} /> GROUNDED
              </>
            ) : (
              "NOT IN MATERIAL"
            )}
          </span>
        </div>
        <p>{message.text}</p>
        {message.sources?.length ? (
          <div className="source-list">
            <span className="source-heading">
              <FileText size={12} /> SOURCES FROM THIS LESSON
            </span>
            {message.sources.map((source, index) => (
              <details
                className="source-item"
                key={`${source.source_type}-${index}`}
              >
                <summary>
                  <span className={`source-type-icon ${source.source_type}`}>
                    <SourceIcon type={source.source_type} />
                  </span>
                  <span>
                    {source.source_type === "study_material"
                      ? "Study material"
                      : source.source_type === "transcript"
                        ? "Video transcript"
                        : "Video"}
                  </span>
                  <ChevronDown size={13} />
                </summary>
                <p>{source.content}</p>
              </details>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SourceIcon({ type }: { type: string }) {
  return type === "video" ? (
    <Play size={12} />
  ) : type === "transcript" ? (
    <Video size={13} />
  ) : (
    <FileText size={13} />
  );
}

function getYouTubeEmbedUrl(videoUrl: string) {
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const videoId =
      host === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : [
              "youtube.com",
              "m.youtube.com",
              "music.youtube.com",
              "youtube-nocookie.com",
            ].includes(host)
          ? (url.searchParams.get("v") ??
            url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1])
          : null;

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
      : null;
  } catch {
    return null;
  }
}

function historyItemToMessages(item: DoubtHistory): Message[] {
  return [
    { role: "user", text: item.question },
    { role: "assistant", text: item.answer, supported: item.supported },
  ];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatSourceLocation(
  page: number | null,
  start: number | null,
  end: number | null,
) {
  if (page !== null) return `Page ${page}`;
  if (start !== null && end !== null)
    return `${formatTime(start)}–${formatTime(end)}`;
  return "Lesson source";
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getErrorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Something went wrong. Please try again.";
}
