import { db } from "../../../../../lib/db";
import { GET_CHAT_MESSAGES } from "../../../../../constants/queries";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = Number(params.id);

    const messages = db
      .prepare(GET_CHAT_MESSAGES)
      .all(chatId);

              if (!messages) {
            return Response.json(
                { error: "chat not found" },
                { status: 404 }
            );
        }


    return new Response(JSON.stringify(messages), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("error getting chats with that chatId", error);

    return new Response(
      JSON.stringify({ error: "cant fetch chat messages" }),
      { status: 500 }
    );
  }
}
