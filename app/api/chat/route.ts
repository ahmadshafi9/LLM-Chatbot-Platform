import { convertToModelMessages, streamText, stepCountIs, UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { NextResponse } from "next/server";

import { lookup_course_materials, search_web } from "./tools";
import { db } from "../../../lib/db";
import {
  GET_ALL_CHATS,
  INSERT_CHAT,
  INSERT_CHAT_MESSAGE,
} from "@/constants/queries";

export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request) {
  let body: { messages: UIMessage[]; chatId?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { messages, chatId: bodyChatId } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required and must not be empty" },
      { status: 400 }
    );
  }

  const result = streamText({
    model: openrouter.chat("@preset/free-cli"),
    system:
      "You are a helpful assistant that gives clear and concise answers in English and no hashes or hashtags just new line if needed and format appealingly. For questions about the user's course—lectures, slides, assignments, or topics in their uploaded class materials—use the lookup_course_materials tool first, then answer from the returned chunks. For current events, general web facts, or news, use the search_web tool and then answer using the results. If both could apply, prefer course materials when the question is clearly about their class.",
    messages: convertToModelMessages(messages),
    tools: { search_web, lookup_course_materials },
    stopWhen: stepCountIs(5),
  });

  const insertMessage = db.transaction(
    (
      chatId: number | undefined,
      title: string,
      message: string,
      role: "user" | "assistant"
    ) => {
      let resolvedChatId = chatId;
      if (resolvedChatId === undefined || resolvedChatId === null) {
        const insertResult = db.prepare(INSERT_CHAT).run(title);
        resolvedChatId = Number(insertResult.lastInsertRowid);
      }
      db.prepare(INSERT_CHAT_MESSAGE).run(resolvedChatId, message, role);
      return resolvedChatId;
    }
  );

  const lastMessage = messages[messages.length - 1];
  const chatTitle =
    messages[0]?.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("") || "New Chat";

  let currentChatId: number | undefined =
    typeof bodyChatId === "number" && Number.isInteger(bodyChatId)
      ? bodyChatId
      : undefined;

  if (lastMessage?.role === "user") {
    const userText =
      lastMessage.parts
        ?.filter((p) => p.type === "text")
        .map((p) => (p as { text: string }).text)
        .join("") ?? "";
    if (userText.trim()) {
      currentChatId = insertMessage(
        currentChatId,
        chatTitle,
        userText.trim(),
        "user"
      );
    }
  }

  // When stream completes, persist the assistant message
  const chatIdForAssistant = currentChatId;
  result.text
    .then((assistantText) => {
      if (assistantText.trim() && chatIdForAssistant != null) {
        try {
          db.prepare(INSERT_CHAT_MESSAGE).run(
            chatIdForAssistant,
            assistantText.trim(),
            "assistant"
          );
        } catch (err) {
          console.error("Failed to persist assistant message:", err);
        }
      }
    })
    .catch(() => {});

  const response = result.toUIMessageStreamResponse();
  if (currentChatId != null) {
    response.headers.set("X-Chat-Id", String(currentChatId));
  }
  return response;
}

export async function GET() {
  try {
    const allChats = db.prepare(GET_ALL_CHATS).all();
    return NextResponse.json(allChats);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
