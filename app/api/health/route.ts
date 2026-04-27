import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    // Lightweight connectivity check — just count without loading data
    const { error } = await supabase.from("ingest_jobs").select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
