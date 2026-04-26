import { getChatMessages } from "@/lib/supabase/chats";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chatId = Number(id);

    if (!Number.isInteger(chatId) || chatId < 1) {
      return Response.json({ error: "Invalid chat id" }, { status: 400 });
    }

    const messages = await getChatMessages(chatId);
    return Response.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return Response.json({ error: "Failed to fetch chat messages" }, { status: 500 });
  }
}
