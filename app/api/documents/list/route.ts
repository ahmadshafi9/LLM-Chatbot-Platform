import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group") || null;

  try {
    const supabase = getServiceSupabase();
    let query = supabase
      .from("ingest_jobs")
      .select("id, source_label, chunks_inserted, uploaded_by, created_at, low_text_warning")
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(50);

    if (groupId) {
      query = query.eq("group_id", groupId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list documents" },
      { status: 500 }
    );
  }
}
