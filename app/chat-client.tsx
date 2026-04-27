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

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem("chatbot_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("chatbot_device_id", id);
  }
  return id;
}

async function fetchAllChats(ownerId: string): Promise<{ chatId: number; title: string; group_name?: string }[]> {
  const res = await fetch(`/api/chat?owner=${encodeURIComponent(ownerId)}`);
  if (!res.ok) throw new Error("Failed to load chats");
  return res.json();
}

async function migrateChats(from: string, to: string, accessToken: string): Promise<void> {
  await fetch("/api/chat/migrate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ from, to }),
  });
}

async function deleteChatById(chatId: number, ownerId: string): Promise<void> {
  const res = await fetch(
    `/api/chat/${chatId}?owner=${encodeURIComponent(ownerId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete chat");
}

interface DocListItem {
  id: string;
  source_label: string;
  chunks_inserted: number | null;
  uploaded_by: string | null;
  created_at: string;
  low_text_warning: boolean | null;
}

async function fetchDocList(groupId: string): Promise<DocListItem[]> {
  const res = await fetch(`/api/documents/list?group=${encodeURIComponent(groupId)}`);
  if (!res.ok) return [];
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
    case "lookup_documents":
      if (part.state === "output-available") return "Read uploaded documents";
      if (part.state === "output-error") return "Document lookup failed";
      return "Looking up documents…";
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

export default function ChatClient({ initialGroupSlug }: { initialGroupSlug?: string }) {
  const [activeChatId, setActiveChatId] = useState<string | undefined>();
  const [allChats, setAllChats] = useState<{ chatId: number; title: string; group_name?: string }[]>([]);
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const ownerIdRef = useRef<string>("");
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
      ownerIdRef.current = `device_${deviceId}`;
      setAuthChecked(true);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      ownerIdRef.current = u ? `user_${u.id}` : `device_${deviceId}`;
      setUser(u);
      setAuthChecked(true);
    });

    const prevUserIdRef = { current: null as string | null };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      const newOwnerId = newUser ? `user_${newUser.id}` : `device_${deviceId}`;
      const wasAnonymous = prevUserIdRef.current === null;

      if (newUser && wasAnonymous && session?.access_token) {
        // Just signed in from anonymous — migrate device chats then reload
        const deviceOwnerId = `device_${deviceId}`;
        migrateChats(deviceOwnerId, `user_${newUser.id}`, session.access_token)
          .then(() => fetchAllChats(newOwnerId))
          .then((chats) => setAllChats(chats))
          .catch(() => {});
      }

      prevUserIdRef.current = newUser?.id ?? null;
      ownerIdRef.current = newOwnerId;
      setUser(newUser);
      if (newUser) setShowAuthModal(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [deviceId]);

  const handleGoogleSignIn = async () => {
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

  const [searchScope, setSearchScope] = useState<"all" | "mine">("all");
  const [docs, setDocs] = useState<DocListItem[]>([]);
  const [docsOpen, setDocsOpen] = useState(false);

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
    if (!ownerIdRef.current) return;
    try {
      const chats = await fetchAllChats(ownerIdRef.current);
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
    if (authChecked) loadChats();
    loadGroups();
  }, [authChecked, loadChats, loadGroups]);

  // Load doc list when group changes
  useEffect(() => {
    if (selectedGroup) {
      fetchDocList(selectedGroup.id).then(setDocs).catch(() => setDocs([]));
    } else {
      setDocs([]);
    }
    setDocsOpen(false);
  }, [selectedGroup]);

  // Auto-select group from URL param
  useEffect(() => {
    if (initialGroupSlug && groups.length > 0 && !selectedGroup) {
      const match = groups.find((g) => g.slug === initialGroupSlug);
      if (match) setSelectedGroup(match);
    }
  }, [groups, initialGroupSlug, selectedGroup]);

  const handleDeleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChatById(chatId, ownerIdRef.current);
      setAllChats((prev) => prev.filter((c) => c.chatId !== chatId));
      if (activeChatId === String(chatId)) {
        setActiveChatId(undefined);
        setMessages([]);
      }
    } catch {
      // silently ignore
    }
  };

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
    fetchAllChats(ownerIdRef.current).then((chats) => {
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
      // When last message is already an assistant bubble, it renders its own
      // tool-activity label — don't add a second thinking row on top.
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
    if (ownerIdRef.current) fd.set("ownerId", ownerIdRef.current);

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
          // Refresh doc list after successful ingest
          if (data.status === "done" && selectedGroup) {
            fetchDocList(selectedGroup.id).then(setDocs).catch(() => {});
          }
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
    ownerId: ownerIdRef.current,
    searchScope: selectedGroup ? searchScope : "all",
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
          <a href="/" className="back-home-btn" title="Back to groups">
            ← Groups
          </a>
          <button
            type="button"
            className="new-chat-btn"
            onClick={() => setActiveChatId(undefined)}
            title="New chat"
          >
            + New
          </button>
        </div>


        {selectedGroup && (
          <div className="scope-toggle-panel">
            <p className="scope-toggle-label">Search materials from</p>
            <div className="scope-toggle-btns">
              <button
                type="button"
                className={`scope-btn${searchScope === "all" ? " active" : ""}`}
                onClick={() => setSearchScope("all")}
              >
                Everyone
              </button>
              <button
                type="button"
                className={`scope-btn${searchScope === "mine" ? " active" : ""}`}
                onClick={() => setSearchScope("mine")}
              >
                Mine only
              </button>
            </div>
          </div>
        )}

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
            <li key={chat.chatId} className="chat-list-item">
              <button
                type="button"
                className={activeChatId === String(chat.chatId) ? "active" : ""}
                onClick={() => {
                  setActiveChatId(String(chat.chatId));
                  if (chat.group_name) {
                    const match = groups.find((g) => g.name === chat.group_name);
                    setSelectedGroup(match ?? null);
                  } else {
                    setSelectedGroup(null);
                  }
                }}
              >
                <span className="chat-title">{chat.title || "New Chat"}</span>
                {chat.group_name && (
                  <span className="chat-group-tag">{chat.group_name}</span>
                )}
              </button>
              <button
                type="button"
                className="chat-delete-btn"
                onClick={(e) => handleDeleteChat(chat.chatId, e)}
                title="Delete chat"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {selectedGroup && docs.length > 0 && (
          <div className="doc-list-panel">
            <button
              type="button"
              className="doc-list-toggle"
              onClick={() => setDocsOpen((v) => !v)}
            >
              <span>Indexed PDFs ({docs.length})</span>
              <span>{docsOpen ? "▲" : "▼"}</span>
            </button>
            {docsOpen && (
              <ul className="doc-list">
                {docs.map((doc) => (
                  <li key={doc.id} className="doc-list-item" title={doc.source_label}>
                    <span className="doc-list-name">{doc.source_label}</span>
                    <span className="doc-list-chunks">
                      {doc.chunks_inserted ?? 0} chunks
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
          {messages.filter((msg, idx) => {
            if (msg.role === "user") return true;
            if (idx === messages.length - 1) return true;
            // Hide intermediate AI messages that are only tool calls (no text)
            return msg.parts.some(
              (p) => p.type === "text" && (p as { text: string }).text.trim().length > 0
            );
          }).map((message) => (
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
              onClick={handleGoogleSignIn}
              disabled={signingIn}
            >
              <GoogleIcon />
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
