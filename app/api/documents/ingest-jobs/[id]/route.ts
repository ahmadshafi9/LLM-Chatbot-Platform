import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("ingest_jobs")
    .select("*")
    .eq("id", jobId)
    .limit(1)
    ;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const job = data?.[0];
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    pageCount: job.page_count,
    extractedTextLength: job.extracted_text_length,
    chunksInserted: job.chunks_inserted,
    lowTextWarning: job.low_text_warning,
    errorText: job.error_text,
  });
}

