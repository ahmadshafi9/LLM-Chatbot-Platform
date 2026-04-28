import type { CourseChunkResult } from "./course-search";

const VOYAGE_RERANK_URL = "https://api.voyageai.com/v1/rerank";
const RERANK_THRESHOLD = 0.1;

type VoyageRerankResponse = {
  data: Array<{ index: number; relevance_score: number }>;
};

/**
 * Voyage cross-encoder rerank: sends query + chunks to Voyage /rerank,
 * drops chunks below RERANK_THRESHOLD, returns remainder sorted best-first.
 *
 * Falls back to original vector-search order if the API call fails.
 */
export async function rerankChunks(
  query: string,
  chunks: CourseChunkResult[]
): Promise<CourseChunkResult[]> {
  if (chunks.length === 0) return chunks;

  const apiKey = process.env.VOYAGEAI_API_KEY;
  if (!apiKey?.trim()) return chunks;

  try {
    const res = await fetch(VOYAGE_RERANK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        documents: chunks.map((c) => c.content),
        model: "rerank-2",
        truncation: true,
      }),
    });

    if (!res.ok) return chunks;

    const data = (await res.json()) as VoyageRerankResponse;

    return data.data
      .filter((r) => r.relevance_score >= RERANK_THRESHOLD)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map((r) => chunks[r.index]);
  } catch {
    return chunks;
  }
}
