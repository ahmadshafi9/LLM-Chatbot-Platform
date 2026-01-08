"use client";

import "./styles.css";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// fetch the role, message parts and everything

async function getChatMessages(id: string) {
  const res = await fetch(`/api/chat/${id}/messages`,{
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    role: "user"
  })
});
  return res.json();
  
}

async function fetchAllChats() {
  const chats = await fetch('/api/chat').then(res => res.json())
  return chats;
}

export default function Page() {
  const [activeChatId, setActiveChatId] = useState<string>();
  const [allChats, setAllChats] = useState<{chatId: string, title: string}[]>([])


  const [initialMessages, setInitialMessages] = useState([]);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    messages: initialMessages,
  });

  // fetch messages when id changes
  useEffect(() => {
    if (!activeChatId) return;

    setInitialMessages([]);

    getChatMessages(activeChatId).then(data => {
      setInitialMessages(data);
    });
  }, [activeChatId]);

  const [input, setInput] = useState();
  const chatRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // detect manual scroll
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;

    const onScroll = () => {
      const threshold = 50;
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setIsAtBottom(atBottom);
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // auto-scroll on new messages
  useEffect(() => {
    if (isAtBottom) {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, status, isAtBottom]);

  useEffect(() => {
    fetchAllChats().then(res => {
      setAllChats(res)
    })
  }, [])

  console.log(initialMessages)

  return (
    <div className='parent-container'>
      <div className="history">
        <ul>
      {allChats?.map((chat) => (
        <li key={chat.chatId}>
          <button onClick={() => setActiveChatId(chat.chatId)}>
            {chat.title} - {chat.chatId}
            </button>
          </li>
      )) ?? null}
    </ul>
      </div>

      <div className="rest">
        <div className="chat" ref={chatRef}>
          {messages.map(message => (
            <div
              className={message.role === "user" ? "chatUser" : "chatAI"}
              key={message.id}
            >
              {message.role === 'user' ? <>User: </> : <>AI: </>}
              {message.parts.map((part, index) =>
                part.type === 'text'
                  ? <span key={index}>{part.text}</span>
                  : null
              )}
            </div>
          ))}

          {status === 'submitted' && (
            <div className="chatAI thinking">
              <span>AI:</span>
              <div className="spinner"></div>
              <span className="thinking-text">thinking...</span>
            </div>
          )}
        </div>

        {!isAtBottom && (
          <button
            onClick={() =>
              chatRef.current?.scrollTo({
                top: chatRef.current.scrollHeight,
                behavior: "smooth",
              })
            }
            style={{
              position: "fixed",
              bottom: "80px",
              right: "20px",
            }}
          >
            Jump to latest ↓
          </button>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput('');
            }
          }}
        >
          <textarea
            className="input"
            value={input}
            rows={1}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  sendMessage({ text: input });
                  setInput('');
                }
              }
            }}
            disabled={status !== 'ready'}
            placeholder="Message ahmadGPT..."
          />
          <div className="submit">
            <button type="submit" disabled={status !== 'ready'}>
              {status === 'submitted' && <div className="submit-spinner"></div>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
