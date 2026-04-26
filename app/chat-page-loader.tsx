"use client";

import dynamic from "next/dynamic";

const ChatClient = dynamic(() => import("./chat-client"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--page-bg, #f0f2f5)",
        color: "#6b7280",
        fontSize: "0.95rem",
      }}
    >
      Loading…
    </div>
  ),
});

export default function ChatPageLoader() {
  return <ChatClient />;
}
