"use client";

import "./styles.css";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef, useCallback } from "react";

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
              <span className="message-content">
                {message.parts.map((part, index) =>
                  part.type === "text" ? (
                    <span key={index}>{part.text}</span>
                  ) : null
                )}
              </span>
            </div>
          ))}
          {status === "submitted" && (
            <div className="chatAI thinking">
              <span className="message-role">AI:</span>
              <div className="spinner" />
              <span className="thinking-text">Thinking…</span>
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
