import { convertToModelMessages, streamText, UIMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { NextResponse } from "next/server";

import { search_web } from "./tools";
import { db } from "../../../lib/db";
import { GET_ALL_CHATS, GET_CHAT, GET_CHAT_MESSAGES, INSERT_CHAT, INSERT_CHAT_MESSAGE } from "@/constants/queries";

export const maxDuration = 30;

const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function POST(req: Request, title: string, tempChatId: number) {
    // const db = new Database("../../chats.sqlite");
    const { messages }: { messages: UIMessage[] } = await req.json();
    const result = streamText({
        model: openrouter.chat("bytedance-seed/seed-1.6-flash"),
        system:
            "You are a helpful assistant that gives clear and concise answers in English and no hashes or hashtags just new line if needed and format applealingly.",
        messages: convertToModelMessages(messages),
        tools: { search_web },

    });

    const insertChatTransaction = db.transaction(
        (chatId: number | undefined, title: string, message: string) => {
            let tempChatId = chatId;

            // if no chatId, create a new chat
            if (tempChatId === undefined) {
                const result = db.prepare(INSERT_CHAT).run(title);
                // use the inserted chat ID
                tempChatId = result.lastInsertRowid as number;
                console.log("Created new chat with id:", tempChatId);
            }

            // insert message into chat

            db.prepare(INSERT_CHAT_MESSAGE).run(tempChatId, message, "user");
        }
    );

    try {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) return;

        const chatTitle =
            messages[0]?.parts
                ?.filter(p => p.type === "text")
                .map(p => p.text)
                .join("") || "New Chat";

        if (lastMessage.role === "user") {
            const userQuestion =
                lastMessage.parts
                    ?.filter(p => p.type === "text")
                    .map(p => p.text)
                    .join("");

            console.log("userQuestion:", userQuestion);

            insertChatTransaction(tempChatId, chatTitle, userQuestion);
        }
        
        if (lastMessage.role === "assistant") {
            const aiAnswer =
                lastMessage.parts
                    ?.filter(p => p.type === "text")
                    .map(p => p.text)
                    .join("");

            console.log("aiAnswer:", aiAnswer);

            insertChatTransaction(tempChatId, chatTitle, aiAnswer);
        }

    } catch (err) {
        console.error(err);
    }

    return result.toUIMessageStreamResponse();
}

export async function GET() {
    try {
        const allChats = db
            .prepare(GET_ALL_CHATS)
            .all()

        return NextResponse.json(
            allChats

        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "status 500 Internal Server Error",
            },
            { status: 500 }
        );
    }
}
