import { NextResponse } from "next/server";
import { deleteChat } from "@/lib/supabase/chats";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chatId = Number(id);
    if (!Number.isInteger(chatId) || chatId < 1) {
      return NextResponse.json({ error: "Invalid chat id" }, { status: 400 });
    }

    const owner = new URL(req.url).searchParams.get("owner");
    if (!owner) {
      return NextResponse.json({ error: "owner is required" }, { status: 400 });
    }

    await deleteChat(chatId, owner);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete chat" },
      { status: 500 }
    );
  }
}
