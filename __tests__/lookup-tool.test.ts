import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for createLookupTool — verifies that the groupId is forwarded
 * to searchCourseMaterials correctly.
 */

const mockSearch = vi.fn();
vi.mock("@/lib/ai/course-search", () => ({
  searchCourseMaterials: mockSearch,
}));

const { createLookupTool } = await import("@/app/api/chat/tools");

describe("createLookupTool", () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  it("calls searchCourseMaterials with null groupId when not provided", async () => {
    mockSearch.mockResolvedValue([]);
    const tool = createLookupTool();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await tool.execute!({ course_search_terms: "lecture" }, {} as never);
    expect(mockSearch).toHaveBeenCalledWith("lecture", 5, null);
  });

  it("calls searchCourseMaterials with the given groupId", async () => {
    mockSearch.mockResolvedValue([]);
    const tool = createLookupTool("group-abc");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await tool.execute!({ course_search_terms: "midterm" }, {} as never);
    expect(mockSearch).toHaveBeenCalledWith("midterm", 5, "group-abc");
  });

  it("returns JSON with chunks on success", async () => {
    mockSearch.mockResolvedValue([
      { id: "1", content: "Some content", metadata: null, distance: 0.1 },
    ]);
    const tool = createLookupTool("grp-1");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = await tool.execute!({ course_search_terms: "topic" }, {} as never);
    const parsed = JSON.parse(result as string);
    expect(parsed.chunks).toHaveLength(1);
    expect(parsed.chunks[0].content).toBe("Some content");
  });

  it("returns JSON error when searchCourseMaterials throws", async () => {
    mockSearch.mockRejectedValue(new Error("Search failure"));
    const tool = createLookupTool("grp-x");
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = await tool.execute!({ course_search_terms: "crash" }, {} as never);
    const parsed = JSON.parse(result as string);
    expect(parsed.error).toBe("Search failure");
    expect(parsed.chunks).toEqual([]);
  });
});
