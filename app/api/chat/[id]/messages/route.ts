import { db } from "../../../../../lib/db";
import { GET_CHAT_MESSAGES } from "../../../../../constants/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chatId = Number(id);

    if (!Number.isInteger(chatId) || chatId < 1) {
      return Response.json(
        { error: "Invalid chat id" },
        { status: 400 }
      );
    }

    const messages = db.prepare(GET_CHAT_MESSAGES).all(chatId);

    return Response.json(messages, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return Response.json(
      { error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}
