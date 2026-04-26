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
    ? `The following documents have been indexed for this course:\n${docNames.map((n) => `- ${n}`).join("\n")}\n`
    : "No documents have been indexed for this course yet.\n";

  const result = streamText({
    model: openrouter.chat("@preset/free-cli"),
    system: `You are a helpful assistant${groupName ? ` for the ${groupName} course` : ""}. Reply in plain English only — no markdown hashes, no XML tags, no JSON blocks, no structured formats of any kind. Use plain sentences and new lines for formatting. If you need to ask the user a question, just ask it naturally in plain text. Never invent, guess, or hallucinate document names or topics — only report what you actually find in tool results.

${groupName ? `${docListLine}\nAlways call lookup_course_materials first for every question to check the uploaded ${groupName} course materials. If the results are relevant, answer from them. If the results are empty or not relevant, tell the user briefly that you could not find this in the course materials, then call search_web and answer from those results.` : `For questions about course content or uploaded materials, use lookup_course_materials first. For general knowledge, current events, or web facts, use search_web. If both could apply, try course materials first.`}`,
    messages: convertToModelMessages(messages),
    tools: { search_web, lookup_course_materials: createLookupTool(groupId ?? null, uploadedBy) },
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
