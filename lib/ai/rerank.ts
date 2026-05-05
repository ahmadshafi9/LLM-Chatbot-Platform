import type { CourseChunkResult } from "./course-search";

const VOYAGE_RERANK_URL = "https://api.voyageai.com/v1/rerank";
const RERANK_THRESHOLD = 0.3;
const FALLBACK_THRESHOLD = 0.15;
const MIN_THRESHOLD_CHUNKS = 3;

export type RerankedChunk = CourseChunkResult & { relevance_score?: number };

type VoyageRerankResponse = {
  data: Array<{ index: number; relevance_score: number }>;
};

/**
 * Voyage cross-encoder rerank: sends query + chunks to Voyage /rerank,
 * drops chunks below RERANK_THRESHOLD, returns remainder sorted best-first
 * with the relevance_score attached so callers can surface confidence.
 *
 * If the strict threshold yields fewer than MIN_THRESHOLD_CHUNKS results,
 * falls back to a looser threshold so sparse queries still get coverage.
 *
 * Falls back to original vector-search order if the API call fails.
 */
export async function rerankChunks(
  query: string,
  chunks: CourseChunkResult[]
): Promise<RerankedChunk[]> {
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
    const sorted = [...data.data].sort(
      (a, b) => b.relevance_score - a.relevance_score
    );

    let kept = sorted.filter((r) => r.relevance_score >= RERANK_THRESHOLD);
    if (kept.length < MIN_THRESHOLD_CHUNKS) {
      kept = sorted.filter((r) => r.relevance_score >= FALLBACK_THRESHOLD);
    }

    return kept.map((r) => ({
      ...chunks[r.index],
      relevance_score: r.relevance_score,
    }));
  } catch {
    return chunks;
  }
}
