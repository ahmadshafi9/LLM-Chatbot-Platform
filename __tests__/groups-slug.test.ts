import { describe, it, expect } from "vitest";

/**
 * Unit tests for the slug generation logic used in the groups API.
 * Extracted here as a pure function to test in isolation.
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("nameToSlug", () => {
  it("lowercases the name", () => {
    expect(nameToSlug("CMPT 276")).toBe("cmpt-276");
  });

  it("replaces spaces with hyphens", () => {
    expect(nameToSlug("Data Structures")).toBe("data-structures");
  });

  it("removes special characters", () => {
    expect(nameToSlug("C++ & Algorithms!")).toBe("c-algorithms");
  });

  it("collapses multiple separators into one hyphen", () => {
    expect(nameToSlug("  SFU  --  CMPT 276  ")).toBe("sfu-cmpt-276");
  });

  it("strips leading and trailing hyphens", () => {
    expect(nameToSlug("---hello---")).toBe("hello");
  });

  it("handles numbers only", () => {
    expect(nameToSlug("276")).toBe("276");
  });

  it("handles already-valid slugs unchanged", () => {
    expect(nameToSlug("cmpt-276")).toBe("cmpt-276");
  });

  it("returns empty string for all-special input", () => {
    expect(nameToSlug("!!!")).toBe("");
  });
});
