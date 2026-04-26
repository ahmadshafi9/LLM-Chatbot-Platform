import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for searchCourseMaterials.
 * Mocks out Supabase and the embedding client so no real I/O happens.
 */

// --- mocks ---
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: () => ({ rpc: mockRpc }),
}));

vi.mock("@/lib/ai/embedding-query", () => ({
  queryEmbeddings: {
    embedQuery: vi.fn().mockResolvedValue(new Array(1024).fill(0.1)),
  },
}));

vi.mock("@/lib/supabase/vector", () => ({
  truncateEmbeddingForStore: (v: number[]) => v.slice(0, 768),
  numbersToPgVectorLiteral: (v: number[]) => `[${v.join(",")}]`,
}));

// Import *after* mocks are set up
const { searchCourseMaterials } = await import("@/lib/ai/course-search");

describe("searchCourseMaterials", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("calls match_course_chunks with p_group_id=null when no groupId given", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchCourseMaterials("lecture slides", 5);
    expect(mockRpc).toHaveBeenCalledWith("match_course_chunks", {
      query_embedding: expect.stringMatching(/^\[/),
      match_count: 5,
      p_group_id: null,
    });
  });

  it("passes groupId to RPC as p_group_id", async () => {
    const testGroupId = "abc-123-uuid";
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchCourseMaterials("midterm", 3, testGroupId);
    expect(mockRpc).toHaveBeenCalledWith("match_course_chunks", {
      query_embedding: expect.any(String),
      match_count: 3,
      p_group_id: testGroupId,
    });
  });

  it("passes null when groupId is explicitly null", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await searchCourseMaterials("homework", 5, null);
    const call = mockRpc.mock.calls[0][1];
    expect(call.p_group_id).toBeNull();
  });

  it("maps RPC rows to CourseChunkResult shape", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: "id-1", content: "Hello world", metadata: { source: "notes.pdf" }, distance: 0.12 },
      ],
      error: null,
    });
    const results = await searchCourseMaterials("hello");
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: "id-1",
      content: "Hello world",
      metadata: { source: "notes.pdf" },
      distance: 0.12,
    });
  });

  it("throws when Supabase returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("DB error") });
    await expect(searchCourseMaterials("fail")).rejects.toThrow("DB error");
  });
});
