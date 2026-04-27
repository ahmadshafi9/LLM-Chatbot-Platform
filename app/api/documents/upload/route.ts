import crypto from "node:crypto";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import { NextResponse } from "next/server";

import { getServiceSupabase } from "@/lib/supabase/server";

export const maxDuration = 60; // Only needs to cover writing temp file + spawning child

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

const RETRIABLE_STATUSES = new Set(["failed", "rejected_too_many_pages"]);

function getIngestHash(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read upload body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const nameLower = file.name.toLowerCase();
  if (file.type !== "application/pdf" && !nameLower.endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  }

  const ingestHash = getIngestHash(buf);
  // Sanitize filename: keep only the basename, strip path separators and
  // control characters, truncate to 200 chars.
  const rawName = path.basename(file.name).replace(/[^\w\s.\-]/g, "_").slice(0, 200);
  const sourceLabel = rawName;
  const filename = rawName;
  const groupId = (form.get("groupId") as string | null)?.trim() || null;
  const uploadedBy = (form.get("ownerId") as string | null)?.trim() || null;

  const supabase = getServiceSupabase();

  // Dedupe: reuse existing job if it succeeded or is still running.
  // Allow retrying if it previously failed.
  const { data: existingRows, error: lookupErr } = await supabase
    .from("ingest_jobs")
    .select("*")
    .eq("ingest_hash", ingestHash)
    .order("created_at", { ascending: false })
    .limit(1);

  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }

  const existingJob = existingRows?.[0];
  if (existingJob && !RETRIABLE_STATUSES.has(existingJob.status)) {
    // Already running or done — return existing job.
    return NextResponse.json(
      { ok: true, jobId: existingJob.id, status: existingJob.status, deduped: true },
      { status: 200 }
    );
  }

  let jobId: string;

  if (existingJob && RETRIABLE_STATUSES.has(existingJob.status)) {
    // Reset the failed/rejected job for a fresh attempt.
    const { error: resetErr } = await supabase
      .from("ingest_jobs")
      .update({
        status: "queued",
        error_text: null,
        page_count: null,
        extracted_text_length: null,
        chunks_inserted: null,
        low_text_warning: null,
      })
      .eq("id", existingJob.id);
    if (resetErr) {
      return NextResponse.json({ error: resetErr.message }, { status: 500 });
    }
    jobId = existingJob.id;
  } else {
    // Brand new job.
    const { data: inserted, error: insertErr } = await supabase
      .from("ingest_jobs")
      .insert({ ingest_hash: ingestHash, status: "queued", source_label: sourceLabel, filename, group_id: groupId, uploaded_by: uploadedBy })
      .select("id")
      .single();
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
    jobId = inserted.id;
  }

  // Write the PDF to a temp file and run ingest-job.ts in a separate process.
  // This is necessary because pdfjs-dist's dynamic worker import is intercepted
  // by Turbopack even when listed in serverExternalPackages. Running outside the
  // Next.js process avoids Turbopack's module system entirely.
  const tmpPath = path.join(os.tmpdir(), `pdf-ingest-${jobId}.pdf`);
  await fs.writeFile(tmpPath, buf);

  const cwd = process.cwd();
  const tsxBin = path.join(cwd, "node_modules", ".bin", "tsx");
  const scriptPath = path.join(cwd, "scripts", "ingest-job.ts");

  const child = spawn(
    tsxBin,
    [scriptPath, tmpPath, jobId, sourceLabel, ingestHash, groupId ?? "", uploadedBy ?? ""],
    {
      cwd,
      // Inherit Next.js process.env so the child gets Supabase keys, etc.
      // without needing --env-file (which depends on cwd being correct).
      env: {
        PATH: process.env.PATH,
        SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        VOYAGEAI_API_KEY: process.env.VOYAGEAI_API_KEY,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let stderrOutput = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrOutput += chunk.toString();
  });
  child.stdout?.on("data", () => {}); // drain stdout

  child.on("close", async (code) => {
    if (code !== 0) {
      // Check whether ingest-job.ts already wrote its own error to Supabase.
      // If the job status is still "processing" the child crashed before it
      // could update it (e.g. tsx compilation failure) — fall back to stderr.
      const bg = getServiceSupabase();
      const { data: rows } = await bg
        .from("ingest_jobs")
        .select("status, error_text")
        .eq("id", jobId)
        .limit(1);
      const job = rows?.[0];
      if (!job || job.status === "processing") {
        // Child crashed before updating Supabase — use captured stderr.
        await bg
          .from("ingest_jobs")
          .update({
            status: "failed",
            error_text: stderrOutput.slice(0, 2000) || `Process exited with code ${code}`,
          })
          .eq("id", jobId);
      }
      // tmpPath cleanup — ingest-job.ts handles it on success/clean exit.
      await fs.unlink(tmpPath).catch(() => {});
    }
  });

  return NextResponse.json({ ok: true, jobId, status: "queued" }, { status: 202 });
}
