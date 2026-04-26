import path from "node:path";
import fs from "fs/promises";
import { processPdfBuffer } from "../lib/ingest/process-pdf";

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

const result = await processPdfBuffer(dataBuffer, sourceLabel);

console.log(`Extracted ${result.extractedTextLength} characters of text from PDF.`);
if (result.lowTextWarning) {
  console.warn(
    "\n[ingest] WARNING: Very little text was extracted from this PDF.\n" +
      "  Common causes: (1) Slides saved as pictures — re-export with embedded text (e.g. PowerPoint\n" +
      "  PDF with standard fonts, or export speaker notes / handout). (2) Scanned PDFs need OCR.\n" +
      "  Until real lecture text is in the file, vector search will not surface your notes.\n"
  );
}

console.log(`Ingested ${result.chunksInserted} chunks from ${sourceLabel} into course_chunks.`);
