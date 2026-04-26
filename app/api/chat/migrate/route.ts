import { NextResponse } from "next/server";
import { migrateChatOwner } from "@/lib/supabase/chats";

export async function POST(req: Request) {
  let body: { from?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { from, to } = body;
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  try {
    const migrated = await migrateChatOwner(from, to);
    return NextResponse.json({ migrated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    );
  }
}
