import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { PDFParse } from "pdf-parse";
import { embeddings } from "@/lib/ai/embedding";
import { splitter } from "@/lib/ai/splitter";
import { getServiceSupabase } from "@/lib/supabase/server";
import {
  numbersToPgVectorLiteral,
  truncateEmbeddingForStore,
} from "@/lib/supabase/vector";

const INSERT_BATCH = 100;
const EMBED_TEXTS_PER_ROUND = 56;

let pdfWorkerConfigured = false;

function ensurePdfJsWorker() {
  if (pdfWorkerConfigured) return;
  pdfWorkerConfigured = true;

  try {
    const require = createRequire(import.meta.url);
    const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    PDFParse.setWorker(pathToFileURL(workerPath).href);
  } catch (err) {
    // Non-fatal: pdfjs will attempt its built-in fallback.
    // Surface via stderr so callers can see it if the fallback also fails.
    console.error("[process-pdf] pdfjs worker setup failed:", err instanceof Error ? err.message : String(err));
  }
}

export class PdfTooManyPagesError extends Error {
  pageCount: number;
  maxPages: number;

  constructor(pageCount: number, maxPages: number) {
    super(`PDF has ${pageCount} pages, exceeds maxPages=${maxPages}`);
    this.pageCount = pageCount;
    this.maxPages = maxPages;
    this.name = "PdfTooManyPagesError";
  }
}

export type ProcessPdfResult = {
  chunksInserted: number;
  sourceLabel: string;
  extractedTextLength: number;
  lowTextWarning: boolean;
  pageCount: number;
};

/**
 * Extract text from a PDF buffer, chunk, embed, and insert rows into `course_chunks`.
 */
export async function processPdfBuffer(
  dataBuffer: Buffer,
  sourceLabel: string,
  opts?: {
    ingestHash?: string;
    ingestJobId?: string;
    maxPages?: number;
    groupId?: string | null;
  }
): Promise<ProcessPdfResult> {
  ensurePdfJsWorker();
  const ingestHash =
    opts?.ingestHash ??
    crypto.createHash("sha256").update(dataBuffer).digest("hex");
  const ingestJobId = opts?.ingestJobId ?? null;

  const parser = new PDFParse({ data: dataBuffer });

  // We need pageCount for enforcing limits before doing expensive embedding work.
  const info = await parser.getInfo();
  const pageCount = info.numPages ?? 0;

  if (typeof opts?.maxPages === "number" && pageCount > opts.maxPages) {
    await parser.destroy();
    throw new PdfTooManyPagesError(pageCount, opts.maxPages);
  }

  const result = await parser.getText({ pageJoiner: "\n\n" });
  await parser.destroy();

  const extracted = result.text.trim();
  const lowTextWarning = extracted.length < 400;

  const texts = await splitter.createDocuments(
    [result.text],
    [{ source: sourceLabel }]
  );

  const chunkTexts = texts.map((d) => d.pageContent);
  const vectors: number[][] = [];
  for (let i = 0; i < chunkTexts.length; i += EMBED_TEXTS_PER_ROUND) {
    const slice = chunkTexts.slice(i, i + EMBED_TEXTS_PER_ROUND);
    const batchVecs = await embeddings.embedDocuments(slice);
    vectors.push(...batchVecs);
  }

  const groupId = opts?.groupId ?? null;
  const supabase = getServiceSupabase();
  let inserted = 0;
  for (let i = 0; i < chunkTexts.length; i += INSERT_BATCH) {
    const slice = chunkTexts.slice(i, i + INSERT_BATCH).map((content, j) => {
      const idx = i + j;
      return {
        content,
        embedding: numbersToPgVectorLiteral(
          truncateEmbeddingForStore(vectors[idx])
        ),
        metadata: {
          source: sourceLabel,
          chunk_index: idx,
          ingest_hash: ingestHash,
          ingest_job_id: ingestJobId,
        },
        group_id: groupId,
      };
    });
    const { error } = await supabase.from("course_chunks").insert(slice);
    if (error) throw error;
    inserted += slice.length;
  }

  return {
    chunksInserted: inserted,
    sourceLabel,
    extractedTextLength: extracted.length,
    lowTextWarning,
    pageCount,
  };
}
