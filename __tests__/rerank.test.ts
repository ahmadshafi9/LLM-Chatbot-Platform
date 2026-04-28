import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { rerankChunks } from "@/lib/ai/rerank";
import type { CourseChunkResult } from "@/lib/ai/course-search";

function chunk(id: string, content: string): CourseChunkResult {
  return { id, content, metadata: null, distance: 0 };
}

describe("rerankChunks", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.VOYAGEAI_API_KEY;

  beforeEach(() => {
    process.env.VOYAGEAI_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.VOYAGEAI_API_KEY;
    else process.env.VOYAGEAI_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("returns empty array unchanged without calling Voyage", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const result = await rerankChunks("anything", []);
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns chunks unchanged when API key is missing", async () => {
    delete process.env.VOYAGEAI_API_KEY;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const chunks = [chunk("a", "first"), chunk("b", "second")];
    const result = await rerankChunks("query", chunks);
    expect(result).toEqual(chunks);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sorts by relevance_score descending and drops scores below threshold", async () => {
    const chunks = [chunk("a", "low"), chunk("b", "high"), chunk("c", "mid")];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { index: 0, relevance_score: 0.05 }, // dropped
          { index: 1, relevance_score: 0.9 },
          { index: 2, relevance_score: 0.4 },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await rerankChunks("q", chunks);
    expect(result.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("falls back to original chunks when Voyage returns non-ok", async () => {
    const chunks = [chunk("a", "x")];
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const result = await rerankChunks("q", chunks);
    expect(result).toEqual(chunks);
  });

  it("falls back to original chunks when fetch throws", async () => {
    const chunks = [chunk("a", "x"), chunk("b", "y")];
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const result = await rerankChunks("q", chunks);
    expect(result).toEqual(chunks);
  });
});
