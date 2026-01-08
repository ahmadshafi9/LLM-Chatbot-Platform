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
            console.log("insert chat message is going to run");

            db.prepare(INSERT_CHAT_MESSAGE).run(tempChatId, message);
            console.log("insert chat message ran");
        }
    );

    try {
        console.log("setting a new title inside the try block");

        const lastUserMessage = messages[messages.length - 1];
        const userQuestion = lastUserMessage.content;
        console.log(userQuestion);
        const chatTitle = messages[0]?.content || "New Chat";
        insertChatTransaction(tempChatId, chatTitle, "userQuestion");
        console.log("completed the insert chat transaction");

    }
    catch (error) {
        console.log("error", error);
    }

    return result.toUIMessageStreamResponse();
}

export async function GET(
    req: Request,
    { params }: { params: { chatid: number } }
) {
    try {
        const chatId = Number(params.chatid);

        if (!chatId) {
            return NextResponse.json(
                { error: "unable to find chat (chatid not found)" },
                { status: 400 }
            );
        }
        const all_chats = db
            .prepare(GET_ALL_CHATS)
            .run()

        return NextResponse.json({
            all_chats
        });
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
