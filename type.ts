export interface Chat {
  chatId: number;
  title: string;
}

export interface ChatMessage {
  messageId: number;
  chatId: number;
  message: string;
  role: "user" | "assistant" | "system";
  created_at: string;
}
