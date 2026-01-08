'use client';
import "./styles.css";
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router'

async function get_all_chats(params:string) {
  const res = await fetch("api/chat/[id]");
  return res.json();
  
}

export default function Page() {
  const router = useRouter();
  const { id } = router.query;

  const [initialMessages, setInitialMessages] = useState([]);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    messages: initialMessages,
  });

  useEffect(() => {
    if (!id) return;

    // reset messages immediately when id changes
    setInitialMessages([]);

    // fetch messages for new id
    get_all_chats(id as string).then((data) => {
      setInitialMessages(data);
    });
  }, [id]); // [dependency array so when id changes it runs]

  const [input, setInput] = useState('');
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
    if (!chat) return // slug not ready yet

    fetch(`/api/chat/messages/${chat}`)
      .then(data => messages(data))
      .catch(err => console.error(err))
  }, [chat])

});



return (
  <div className='parent-container'>
    <div className="history">
      {/* <div id="chat">
        {messages.map((msg, index) => (
          <p key={index}><strong>{msg.user}:</strong> {msg.text}</p>
        ))}
      </div> */}
      <div>
        <p>Post: {router.query.chat}</p>
      </div>
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
