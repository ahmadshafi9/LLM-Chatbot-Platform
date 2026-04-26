import { Suspense } from "react";
import ChatPageLoader from "../chat-page-loader";

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageLoader />
    </Suspense>
  );
}
