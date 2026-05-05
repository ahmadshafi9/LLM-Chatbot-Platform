import { convertToModelMessages, streamText, stepCountIs, UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { NextResponse } from "next/server";

import { createLookupTool, search_web } from "./tools";
import {
  getAllChats,
  insertChat,
  insertChatMessage,
} from "@/lib/supabase/chats";
import { getServiceSupabase } from "@/lib/supabase/server";

async function getIndexedDocNames(groupId: string | null | undefined): Promise<string[]> {
  if (!groupId) return [];
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("ingest_jobs")
      .select("source_label")
      .eq("status", "done")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []).map((r: { source_label: string }) => r.source_label);
  } catch {
    return [];
  }
}

export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const ANONYMOUS_OWNER = "anonymous";

export async function POST(req: Request) {
  let body: {
    messages: UIMessage[];
    chatId?: number | null;
    groupId?: string | null;
    groupName?: string | null;
    ownerId?: string | null;
    searchScope?: "all" | "mine";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, chatId: bodyChatId, groupId, groupName, ownerId, searchScope } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required and must not be empty" },
      { status: 400 }
    );
  }
  if (messages.length > 100) {
    return NextResponse.json({ error: "Too many messages" }, { status: 400 });
  }
  const totalLength = messages.reduce((sum, m) => {
    const textLen = (m.parts ?? []).reduce(
      (s, p) => s + (p.type === "text" ? (p as { type: "text"; text: string }).text.length : 0),
      0
    );
    return sum + textLen;
  }, 0);
  if (totalLength > 100_000) {
    return NextResponse.json({ error: "Message content too large" }, { status: 400 });
  }

  const resolvedOwner = ownerId?.trim() || ANONYMOUS_OWNER;
  const uploadedBy = searchScope === "mine" && ownerId ? ownerId : null;

  const chatTitle =
    messages[0]?.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("") || "New Chat";

  // Insert user message into Supabase before streaming
  let currentChatId: number | undefined =
    typeof bodyChatId === "number" && Number.isInteger(bodyChatId)
      ? bodyChatId
      : undefined;

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") {
    const userText =
      lastMessage.parts
        ?.filter((p) => p.type === "text")
        .map((p) => (p as { text: string }).text)
        .join("") ?? "";
    if (userText.trim()) {
      try {
        if (!currentChatId) {
          currentChatId = await insertChat(chatTitle, groupName ?? null, resolvedOwner);
        }
        await insertChatMessage(currentChatId, userText.trim(), "user");
      } catch (err) {
        console.error("Failed to persist user message:", err);
      }
    }
  }

  const docNames = await getIndexedDocNames(groupId);
  const docListLine = docNames.length > 0
    ? `The following documents are available to search:\n${docNames.map((n) => `- ${n}`).join("\n")}\n`
    : "No documents have been uploaded yet.\n";

  const result = streamText({
    // NOTE: cast is required due provider type duplication between ai-sdk packages in build env.
    model: openrouter.chat("@preset/free-cli") as Parameters<typeof streamText>[0]["model"],
    system: `You are a smart, friendly personal assistant${groupName ? ` in the "${groupName}" workspace` : ""}. You help with anything the user needs — answering questions, explaining concepts, writing, brainstorming, research, coding, math, or everyday tasks. Reply in plain English only — no markdown hashes, no XML tags, no JSON blocks, no structured formats of any kind. Use plain sentences and new lines for formatting. Keep answers concise, readable, and human by default. Avoid overly long replies, avoid excessive bullets/symbols/formatting, and keep the tone natural. Only provide long, highly detailed responses when the user explicitly asks for detail, depth, or a full breakdown. If you need to ask the user a question, just ask it naturally. Never invent, guess, or hallucinate document names or file contents — only report what you actually find in tool results.

${docListLine}
Use lookup_documents when the user asks about something that might be in their uploaded files — notes, PDFs, reports, anything they've shared. Use search_web for current events, facts you're unsure about, or anything not covered by uploaded documents. If both could be relevant, check documents first. If neither tool is needed, just answer directly.

When you answer using lookup_documents results, follow these rules:
- Each chunk includes a "source" (the document name) and a "relevance_score" between 0 and 1. Higher means the chunk more directly matches the question.
- For any factual claim taken from a chunk, name the source document in plain language (e.g. "According to chapter6-part2.pdf, ..."). Do not fabricate a source name — only use the "source" field provided.
- Prefer chunks with higher relevance_score. Treat scores below ~0.4 as weak evidence: only rely on them if nothing better is available, and acknowledge the uncertainty.
- If chunks disagree with each other, present both perspectives and name each source rather than silently picking one.
- If no returned chunk directly answers the question, say so honestly (e.g. "I don't see this covered in your uploaded files") instead of guessing or padding with general knowledge. You may then offer to search the web or answer from general knowledge if the user wants.`,
    messages: convertToModelMessages(messages),
    tools: { search_web, lookup_documents: createLookupTool(groupId ?? null, uploadedBy) },
    stopWhen: stepCountIs(5),
  });

  // After stream completes, persist assistant message
  const chatIdForAssistant = currentChatId;
  result.text
    .then(async (assistantText) => {
      if (assistantText.trim() && chatIdForAssistant != null) {
        await insertChatMessage(chatIdForAssistant, assistantText.trim(), "assistant");
      }
    })
    .catch(() => {});

  const response = result.toUIMessageStreamResponse();
  if (currentChatId != null) {
    response.headers.set("X-Chat-Id", String(currentChatId));
  }
  return response;
}

export async function GET(req: Request) {
  try {
    const owner =
      new URL(req.url).searchParams.get("owner") || ANONYMOUS_OWNER;
    const chats = await getAllChats(owner);
    return NextResponse.json(chats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
