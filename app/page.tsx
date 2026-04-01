"use client";

import "./styles.css";
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

interface ApiMessage {
  messageId: number;
  chatId: number;
  message: string;
  role: string;
  created_at: string;
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

export default function Page() {
  const [activeChatId, setActiveChatId] = useState<string | undefined>();
  const [allChats, setAllChats] = useState<{ chatId: number; title: string }[]>([]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const hadNoActiveChatRef = useRef(false);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: [],
  });

  // Load chat list on mount and when coming back from a new chat
  const loadChats = useCallback(async () => {
    try {
      const chats = await fetchAllChats();
      setAllChats(chats);
    } catch (e) {
      console.error("Failed to fetch chats", e);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // When switching to a chat, load its messages; when no chat, clear messages
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

  // After sending first message in "new chat", refetch list and select newest
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status !== "ready") return;
    if (!activeChatId) hadNoActiveChatRef.current = true;
    sendMessage(
      { text },
      {
        body: {
          chatId: activeChatId ? Number(activeChatId) : null,
        },
      }
    );
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = input.trim();
      if (!text || status !== "ready") return;
      if (!activeChatId) hadNoActiveChatRef.current = true;
      sendMessage(
        { text },
        { body: { chatId: activeChatId ? Number(activeChatId) : null } }
      );
      setInput("");
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
        <div className="chat" ref={chatRef}>
          {messages.length === 0 && status === "ready" && (
            <div className="empty-state">
              <p>Start a new chat or pick one from the sidebar.</p>
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
            placeholder="Message ahmadGPT…"
          />
          <div className="submit">
            <button type="submit" disabled={status !== "ready"}>
              {status === "submitted" && <div className="submit-spinner" />}
              <span className="submit-label">Send</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
