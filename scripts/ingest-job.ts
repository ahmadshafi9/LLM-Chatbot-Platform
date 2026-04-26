import fs from "node:fs/promises";

import { PdfTooManyPagesError, processPdfBuffer } from "../lib/ingest/process-pdf";
import { getServiceSupabase } from "../lib/supabase/server";

const MAX_PAGES_PUBLIC = 100;

const [filePath, jobId, sourceLabel, ingestHash, rawGroupId, rawUploadedBy] = process.argv.slice(2);

if (!filePath || !jobId || !sourceLabel || !ingestHash) {
  console.error(
    "Usage: node --env-file=.env.local --import tsx scripts/ingest-job.ts <filePath> <jobId> <sourceLabel> <ingestHash> [groupId] [uploadedBy]"
  );
  process.exit(1);
}

const groupId: string | null = rawGroupId?.trim() || null;
const uploadedBy: string | null = rawUploadedBy?.trim() || null;

const supabase = getServiceSupabase();

function stringifyUnknownError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    // Try common fields first
    const anyE = e as Record<string, unknown>;
    const msg =
      typeof anyE.message === "string"
        ? anyE.message
        : typeof anyE.error === "string"
          ? anyE.error
          : null;
    if (msg) return msg;
    try {
      return JSON.stringify(e);
    } catch {
      return "[unserializable error object]";
    }
  }
  return String(e);
}

async function fail(status: string, errorText: string, pageCount?: number) {
  await supabase
    .from("ingest_jobs")
    .update({
      status,
      error_text: errorText,
      page_count: pageCount ?? null,
    })
    .eq("id", jobId);
}

try {
  await supabase
    .from("ingest_jobs")
    .update({ status: "processing" })
    .eq("id", jobId);

  const buf = await fs.readFile(filePath);

  const result = await processPdfBuffer(buf, sourceLabel, {
    ingestHash,
    ingestJobId: jobId,
    maxPages: MAX_PAGES_PUBLIC,
    groupId,
    uploadedBy,
  });

  await supabase
    .from("ingest_jobs")
    .update({
      status: "done",
      page_count: result.pageCount,
      extracted_text_length: result.extractedTextLength,
      chunks_inserted: result.chunksInserted,
      low_text_warning: result.lowTextWarning,
      error_text: null,
    })
    .eq("id", jobId);
} catch (e) {
  const errText = stringifyUnknownError(e);
  console.error(errText); // captured by parent's stderr listener as fallback
  if (e instanceof PdfTooManyPagesError) {
    await fail("rejected_too_many_pages", errText, e.pageCount);
    process.exit(0);
  }
  await fail("failed", errText);
  process.exit(1);
} finally {
  // best-effort cleanup
  try {
    await fs.unlink(filePath);
  } catch {}
}

