"use client";

import "./styles.css";
import AuthButton from "./components/AuthButton";
import { getBrowserSupabase } from "../lib/supabase/client";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolOrDynamicToolName,
  isReasoningUIPart,
  isToolOrDynamicToolUIPart,
} from "ai";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { UIMessage } from "ai";
import type { User } from "@supabase/supabase-js";

interface ApiMessage {
  messageId: number;
  chatId: number;
  message: string;
  role: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
}

function mapApiMessagesToUIMessages(apiMessages: ApiMessage[]) {
  return apiMessages.map((m) => ({
    id: String(m.messageId),
    role: m.role as "user" | "assistant" | "system",
    parts: [{ type: "text" as const, text: m.message }],
  }));
}

async function getChatMessages(id: string): Promise<ApiMessage[]> {
  const res = await fetch(`/api/chat/${id}/messages`, { method: "GET" });
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}

async function fetchAllChats(): Promise<{ chatId: number; title: string }[]> {
  const res = await fetch("/api/chat");
  if (!res.ok) throw new Error("Failed to load chats");
  return res.json();
}

async function fetchGroups(): Promise<Group[]> {
  const res = await fetch("/api/groups");
  if (!res.ok) throw new Error("Failed to load groups");
  return res.json();
}

async function createGroup(name: string): Promise<Group> {
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create group");
  return data;
}

function toolActivityLabel(part: UIMessage["parts"][number]): string | null {
  if (!isToolOrDynamicToolUIPart(part)) return null;
  const name = getToolOrDynamicToolName(part);
  switch (name) {
    case "lookup_course_materials":
      if (part.state === "output-available") return "Read course materials";
      if (part.state === "output-error") return "Course materials lookup failed";
      return "Looking up course materials…";
    case "search_web":
      if (part.state === "output-available") return "Searched the web";
      if (part.state === "output-error") return "Web search failed";
      return "Searching the web…";
    default:
      if (part.state === "output-available") return `Finished: ${name}`;
      if (part.state === "output-error") return `Failed: ${name}`;
      return `Running ${name}…`;
  }
}

function hasInFlightToolOrReasoning(msg: UIMessage): boolean {
  for (const p of msg.parts) {
    if (isToolOrDynamicToolUIPart(p)) {
      if (p.state === "input-streaming" || p.state === "input-available") {
        return true;
      }
    }
    if (isReasoningUIPart(p) && p.state === "streaming") return true;
  }
  return false;
}

function CollapsibleReasoningBlock({
  text,
  state,
}: {
  text: string;
  state?: "streaming" | "done";
}) {
  const [open, setOpen] = useState(false);
  const streaming = state === "streaming";
  return (
    <div className="reasoning-block">
      <button
        type="button"
        className="reasoning-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="reasoning-chevron" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
        <span className="reasoning-label">Thinking</span>
        {streaming && <span className="reasoning-streaming-dot">…</span>}
      </button>
      {open && (
        <div className="reasoning-text-wrap">
          <div className="reasoning-text">{text || (streaming ? "…" : "")}</div>
        </div>
      )}
    </div>
  );
}

function streamingStatusHint(last: UIMessage | undefined): string {
  if (!last || last.role !== "assistant") return "Thinking…";
  if (last.parts.length === 0) return "Thinking…";
  for (let i = last.parts.length - 1; i >= 0; i--) {
    const p = last.parts[i];
    if (isToolOrDynamicToolUIPart(p)) {
      if (p.state === "input-streaming" || p.state === "input-available") {
        return toolActivityLabel(p) ?? "Thinking…";
      }
    }
    if (isReasoningUIPart(p) && p.state === "streaming") return "Thinking…";
  }
  return "Writing…";
}

export default function ChatClient() {
  const [activeChatId, setActiveChatId] = useState<string | undefined>();
  const [allChats, setAllChats] = useState<{ chatId: number; title: string }[]>([]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const hadNoActiveChatRef = useRef(false);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Demo quota — first 5 messages are free
  const DEMO_LIMIT = 5;
  const [demoCount, setDemoCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("demo_messages_used") ?? "0", 10);
  });

  useEffect(() => {
    let supabase: ReturnType<typeof getBrowserSupabase>;
    try {
      supabase = getBrowserSupabase();
    } catch {
      setAuthChecked(true);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setShowAuthModal(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLinkedInSignIn = async () => {
    setSigningIn(true);
    try {
      const supabase = getBrowserSupabase();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    } catch {
      setSigningIn(false);
    }
  };

  // Group state
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupCreateState, setGroupCreateState] = useState<"idle" | "loading" | "error">("idle");
  const [groupCreateError, setGroupCreateError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">(
    "idle"
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ingestJob, setIngestJob] = useState<{
    jobId: string;
    status: string;
    pageCount?: number;
    chunksInserted?: number;
    lowTextWarning?: boolean;
    errorText?: string;
  } | null>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: [],
  });

  const loadChats = useCallback(async () => {
    try {
      const chats = await fetchAllChats();
      setAllChats(chats);
    } catch (e) {
      console.error("Failed to fetch chats", e);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const data = await fetchGroups();
      setGroups(data);
    } catch (e) {
      console.error("Failed to fetch groups", e);
    }
  }, []);

  useEffect(() => {
    loadChats();
    loadGroups();
  }, [loadChats, loadGroups]);

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setGroupCreateState("loading");
    setGroupCreateError(null);
    try {
      const group = await createGroup(name);
      setGroups((prev) => [...prev, group]);
      setSelectedGroup(group);
      setNewGroupName("");
      setGroupCreateState("idle");
    } catch (e) {
      setGroupCreateError(e instanceof Error ? e.message : "Failed to create");
      setGroupCreateState("error");
    }
  };

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    setMessages([]);
    getChatMessages(activeChatId)
      .then((data) => setMessages(mapApiMessagesToUIMessages(data)))
      .catch((e) => console.error("Failed to load messages", e));
  }, [activeChatId, setMessages]);

  useEffect(() => {
    if (!hadNoActiveChatRef.current || (status !== "ready" && status !== "streaming")) return;
    hadNoActiveChatRef.current = false;
    fetchAllChats().then((chats) => {
      setAllChats(chats);
      if (chats.length > 0) setActiveChatId(String(chats[0].chatId));
    });
  }, [status]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 50;
      setIsAtBottom(
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold
      );
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, status, isAtBottom]);

  const { thinkingRowVisible, thinkingRowLabel } = useMemo(() => {
    if (status !== "streaming" && status !== "submitted") {
      return { thinkingRowVisible: false, thinkingRowLabel: "" };
    }
    const last = messages[messages.length - 1];
    if (status === "submitted") {
      return {
        thinkingRowVisible: true,
        thinkingRowLabel: streamingStatusHint(
          last?.role === "assistant" ? last : undefined
        ),
      };
    }
    if (status === "streaming") {
      if (!last || last.role === "user") {
        return { thinkingRowVisible: true, thinkingRowLabel: "Thinking…" };
      }
      if (last.role === "assistant" && hasInFlightToolOrReasoning(last)) {
        return {
          thinkingRowVisible: true,
          thinkingRowLabel: streamingStatusHint(last),
        };
      }
    }
    return { thinkingRowVisible: false, thinkingRowLabel: "" };
  }, [messages, status]);

  const handlePickCoursePdf = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleCoursePdfSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;

    setUploadState("uploading");
    setUploadError(null);
    setIngestJob(null);

    const fd = new FormData();
    fd.set("file", f);
    if (selectedGroup) fd.set("groupId", selectedGroup.id);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        error?: string;
        jobId?: string;
        status?: string;
        deduped?: boolean;
      };

      if (!res.ok) {
        setUploadState("error");
        setUploadError(data.error || res.statusText);
        return;
      }

      if (!data.jobId || !data.status) {
        setUploadState("error");
        setUploadError("Unexpected upload response from server.");
        return;
      }

      setIngestJob({
        jobId: data.jobId,
        status: data.status,
      });
      setUploadState("idle");
    } catch (err) {
      setUploadState("error");
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  useEffect(() => {
    if (!ingestJob?.jobId) return;

    const terminalStatuses = new Set([
      "done",
      "failed",
      "rejected_too_many_pages",
    ]);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/documents/ingest-jobs/${ingestJob.jobId}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          jobId: string;
          status: string;
          pageCount?: number | null;
          extractedTextLength?: number | null;
          chunksInserted?: number | null;
          lowTextWarning?: boolean | null;
          errorText?: string | null;
        };

        if (cancelled) return;

        setIngestJob({
          jobId: data.jobId,
          status: data.status,
          pageCount: data.pageCount ?? undefined,
          chunksInserted: data.chunksInserted ?? undefined,
          lowTextWarning: data.lowTextWarning ?? undefined,
          errorText: data.errorText ?? undefined,
        });

        if (terminalStatuses.has(data.status)) {
          if (intervalId) clearInterval(intervalId);
        }
      } catch {
        // keep polling; transient network errors are expected
      }
    };

    poll();
    intervalId = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [ingestJob?.jobId]);

  const chatBody = {
    chatId: activeChatId ? Number(activeChatId) : null,
    groupId: selectedGroup?.id ?? null,
    groupName: selectedGroup?.name ?? null,
  };

  const trySend = (text: string) => {
    if (!text || status !== "ready") return;
    if (authChecked && !user && demoCount >= DEMO_LIMIT) {
      setShowAuthModal(true);
      return;
    }
    if (!activeChatId) hadNoActiveChatRef.current = true;
    sendMessage({ text }, { body: chatBody });
    setInput("");
    if (!user) {
      const next = demoCount + 1;
      setDemoCount(next);
      localStorage.setItem("demo_messages_used", String(next));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trySend(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      trySend(input.trim());
    }
  };

  return (
    <div className="parent-container">
      <aside className="history">
        <div className="history-header">
          <h2>Chats</h2>
          <button
            type="button"
            className="new-chat-btn"
            onClick={() => setActiveChatId(undefined)}
            title="New chat"
          >
            + New
          </button>
        </div>

        {/* Group / AI selector */}
        <div className="group-panel">
          <p className="group-panel-label">Select AI</p>
          <div className="group-list">
            <button
              type="button"
              className={`group-btn${selectedGroup === null ? " active" : ""}`}
              onClick={() => setSelectedGroup(null)}
            >
              <span className="group-dot" />
              General
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`group-btn${selectedGroup?.id === g.id ? " active" : ""}`}
                onClick={() => setSelectedGroup(g)}
              >
                <span className="group-dot" />
                {g.name}
              </button>
            ))}
          </div>
          <div className="group-create-row">
            <input
              className="group-create-input"
              placeholder="New group name…"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateGroup();
              }}
              disabled={groupCreateState === "loading"}
            />
            <button
              type="button"
              className="group-create-btn"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || groupCreateState === "loading"}
            >
              {groupCreateState === "loading" ? "…" : "+"}
            </button>
          </div>
          {groupCreateState === "error" && groupCreateError && (
            <p className="group-error">{groupCreateError}</p>
          )}
        </div>

        <div className="doc-upload-panel">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: "none" }}
            onChange={handleCoursePdfSelected}
          />
          <button
            type="button"
            className="doc-upload-btn"
            onClick={handlePickCoursePdf}
            disabled={uploadState === "uploading"}
            title="Upload a course PDF and index it for RAG"
          >
            {uploadState === "uploading" ? "Indexing PDF…" : "Add course PDF"}
          </button>
          {ingestJob ? (
            <p
              className={
                ingestJob.status === "done"
                  ? "doc-upload-msg doc-upload-msg-ok"
                  : ingestJob.status === "failed" ||
                    ingestJob.status === "rejected_too_many_pages"
                  ? "doc-upload-msg doc-upload-msg-err"
                  : "doc-upload-msg"
              }
            >
              {ingestJob.status === "done" ? (
                <>
                  Indexed {ingestJob.chunksInserted ?? 0} chunk
                  {ingestJob.chunksInserted === 1 ? "" : "s"}.
                  {ingestJob.lowTextWarning ? (
                    <div className="doc-upload-msg-hint">
                      Little text found—image slides may need OCR.
                    </div>
                  ) : null}
                </>
              ) : ingestJob.status === "rejected_too_many_pages" ? (
                <>
                  Rejected: PDF has more than 100 pages (MVP limit).
                </>
              ) : ingestJob.status === "failed" ? (
                <>
                  Ingest failed: {ingestJob.errorText ?? "Unknown error"}
                </>
              ) : (
                <>Ingesting: {ingestJob.status}…</>
              )}
            </p>
          ) : null}
          {uploadState === "error" && uploadError ? (
            <p className="doc-upload-msg doc-upload-msg-err">{uploadError}</p>
          ) : null}
        </div>
        <ul className="chat-list">
          {allChats.map((chat) => (
            <li key={chat.chatId}>
              <button
                type="button"
                className={activeChatId === String(chat.chatId) ? "active" : ""}
                onClick={() => setActiveChatId(String(chat.chatId))}
              >
                <span className="chat-title">{chat.title || "New Chat"}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="rest">
        <div className="main-topbar">
          <AuthButton />
        </div>
        {selectedGroup && (
          <div className="chat-header-badge">
            <span className="chat-header-badge-dot" />
            <span className="chat-header-badge-name">{selectedGroup.name} AI</span>
            <span>— documents scoped to this group</span>
          </div>
        )}
        <div className="chat" ref={chatRef}>
          {messages.length === 0 && status === "ready" && (
            <div className="empty-state">
              <p>
                {selectedGroup
                  ? `Ask the ${selectedGroup.name} AI anything.`
                  : "Select an AI from the sidebar or start chatting."}
              </p>
            </div>
          )}
          {messages.map((message) => (
            <div
              className={
                message.role === "user" ? "chatUser" : "chatAI"
              }
              key={message.id}
            >
              <span className="message-role">
                {message.role === "user" ? "You" : "AI"}:
              </span>
              <div className="message-content">
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return <span key={index}>{part.text}</span>;
                  }
                  if (isReasoningUIPart(part)) {
                    return (
                      <CollapsibleReasoningBlock
                        key={index}
                        text={part.text}
                        state={part.state}
                      />
                    );
                  }
                  if (isToolOrDynamicToolUIPart(part)) {
                    const line = toolActivityLabel(part);
                    if (!line) return null;
                    return (
                      <div
                        key={index}
                        className={`tool-activity tool-state-${part.state}`}
                      >
                        {line}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
          {thinkingRowVisible && (
            <div className="chatAI thinking">
              <span className="message-role">AI:</span>
              <div className="spinner" />
              <span className="thinking-text">{thinkingRowLabel}</span>
            </div>
          )}
        </div>

        {!isAtBottom && (
          <button
            type="button"
            className="jump-to-bottom"
            onClick={() =>
              chatRef.current?.scrollTo({
                top: chatRef.current.scrollHeight,
                behavior: "smooth",
              })
            }
          >
            Jump to latest ↓
          </button>
        )}

        {authChecked && !user && demoCount < DEMO_LIMIT && (
          <p className="demo-quota-hint">
            {DEMO_LIMIT - demoCount} free message{DEMO_LIMIT - demoCount === 1 ? "" : "s"} left — <button type="button" className="demo-quota-signin" onClick={() => setShowAuthModal(true)}>sign in</button> for unlimited
          </p>
        )}

        <form onSubmit={handleSubmit} className="input-form">
          <textarea
            className="input"
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              const t = e.target;
              t.style.height = "auto";
              t.style.height = t.scrollHeight + "px";
            }}
            onKeyDown={handleKeyDown}
            disabled={status !== "ready"}
            placeholder={selectedGroup ? `Message ${selectedGroup.name} AI…` : "Message…"}
          />
          <div className="submit">
            <button type="submit" disabled={status !== "ready"}>
              {status === "submitted" && <div className="submit-spinner" />}
              <span className="submit-label">Send</span>
            </button>
          </div>
        </form>
      </main>

      {showAuthModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="auth-modal-close"
              onClick={() => setShowAuthModal(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="auth-modal-icon">💬</div>
            <h2 className="auth-modal-title">You've used your 5 free messages</h2>
            <p className="auth-modal-body">
              Sign in for unlimited chats and to save your chat history — it's free.
            </p>
            <button
              type="button"
              className="auth-oauth-btn auth-modal-google"
              onClick={handleLinkedInSignIn}
              disabled={signingIn}
            >
              <LinkedInIcon />
              {signingIn ? "Redirecting…" : "Continue with Google"}
            </button>
            <p className="auth-modal-skip">
              <button
                type="button"
                className="auth-modal-skip-btn"
                onClick={() => setShowAuthModal(false)}
              >
                Maybe later
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
