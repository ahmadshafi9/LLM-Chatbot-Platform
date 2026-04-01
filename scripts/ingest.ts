import path from "node:path";
import fs from "fs/promises";
import { PDFParse } from "pdf-parse";
import { embeddings } from "../lib/ai/embedding";
import { getServiceSupabase } from "../lib/supabase/server";
import {
  numbersToPgVectorLiteral,
  truncateEmbeddingForStore,
} from "../lib/supabase/vector";
import { splitter } from "../lib/ai/splitter";

const INSERT_BATCH = 100;
/** Voyage allows small batch sizes; LangChain fires all sub-batches in parallel. Keep this low to avoid huge parallel spikes on long PDFs. */
const EMBED_TEXTS_PER_ROUND = 56;

const pdfPath =
  process.argv
    .slice(2)
    .join(" ")
    .trim() || process.env.INGEST_PDF_PATH?.trim();
if (!pdfPath) {
  console.error("Missing PDF path.");
  console.error("  npm run ingest -- path/to/file.pdf");
  console.error("  Or: INGEST_PDF_PATH=/abs/path/file.pdf npm run ingest");
  process.exit(1);
}
const sourceLabel = path.basename(pdfPath);

const dataBuffer = await fs.readFile(pdfPath);
const parser = new PDFParse({ data: dataBuffer });
// pdf-parse defaults pageJoiner to "\n-- 1 of N --\n" between pages; that string is not lecture
// content and pollutes chunks. Use a plain break between pages instead.
const result = await parser.getText({ pageJoiner: "\n\n" });
await parser.destroy();

const extracted = result.text.trim();
console.log(`Extracted ${extracted.length} characters of text from PDF.`);

// Slides exported as images, or scanned PDFs, often yield almost no selectable text—only
// headers/footers—so RAG stores near-empty chunks and retrieval looks "broken".
if (extracted.length < 400) {
  console.warn(
    "\n[ingest] WARNING: Very little text was extracted from this PDF.\n" +
      "  Common causes: (1) Slides saved as pictures — re-export with embedded text (e.g. PowerPoint\n" +
      "  PDF with standard fonts, or export speaker notes / handout). (2) Scanned PDFs need OCR.\n" +
      "  Until real lecture text is in the file, vector search will not surface your notes.\n"
  );
}

const texts = await splitter.createDocuments(
  [result.text],
  [{ source: sourceLabel }]
);

const chunkTexts = texts.map((d) => d.pageContent);
console.log(`Chunks to embed: ${chunkTexts.length}`);
const vectors: number[][] = [];
for (let i = 0; i < chunkTexts.length; i += EMBED_TEXTS_PER_ROUND) {
  const slice = chunkTexts.slice(i, i + EMBED_TEXTS_PER_ROUND);
  const batchVecs = await embeddings.embedDocuments(slice);
  vectors.push(...batchVecs);
  console.log(`Embedded ${vectors.length} / ${chunkTexts.length}`);
}

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
      },
    };
  });
  const { error } = await supabase.from("course_chunks").insert(slice);
  if (error) throw error;
  inserted += slice.length;
}

console.log(`Ingested ${inserted} chunks from ${sourceLabel} into course_chunks.`);
