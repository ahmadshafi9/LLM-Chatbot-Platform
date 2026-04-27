import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { migrateChatOwner } from "@/lib/supabase/chats";

export async function POST(req: Request) {
  // Verify the caller is authenticated
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Ensure the caller can only migrate chats into their own account
  if (to !== `user_${user.id}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
