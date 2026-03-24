import fs from "fs/promises";
import { PDFParse } from "pdf-parse";
import { splitter } from "../lib/ai/splitter";
import { embeddings } from "../lib/ai/embedding"

const dataBuffer = await fs.readFile("content/course-materials/chapter6-part2(1).pdf");
const parser = new PDFParse({ data: dataBuffer });
const result = await parser.getText();
await parser.destroy();

const texts = await splitter.createDocuments(
  [result.text],
  [{ source: "chapter6-part2(1).pdf" }]
);
// then use texts (e.g. embed and store)

const chunkTexts = texts.map((d) => d.pageContent);
const vectors = await embeddings.embedDocuments(chunkTexts);