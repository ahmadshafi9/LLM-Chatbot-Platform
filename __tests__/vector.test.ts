import { describe, it, expect } from "vitest";

import {
  STORED_EMBEDDING_DIM,
  numbersToPgVectorLiteral,
  truncateEmbeddingForStore,
} from "@/lib/supabase/vector";

describe("truncateEmbeddingForStore", () => {
  it("truncates a 1024-d vector down to the stored dimension", () => {
    const vec = Array.from({ length: 1024 }, (_, i) => i);
    const out = truncateEmbeddingForStore(vec);
    expect(out).toHaveLength(STORED_EMBEDDING_DIM);
    expect(out[0]).toBe(0);
    expect(out[STORED_EMBEDDING_DIM - 1]).toBe(STORED_EMBEDDING_DIM - 1);
  });

  it("returns the vector unchanged when already at or below the target dim", () => {
    const vec = Array.from({ length: STORED_EMBEDDING_DIM }, () => 0.5);
    expect(truncateEmbeddingForStore(vec)).toEqual(vec);
  });

  it("respects an explicit dim override", () => {
    const vec = Array.from({ length: 100 }, (_, i) => i);
    expect(truncateEmbeddingForStore(vec, 10)).toHaveLength(10);
  });

  it("does not mutate the input vector", () => {
    const vec = Array.from({ length: 1024 }, (_, i) => i);
    const copy = [...vec];
    truncateEmbeddingForStore(vec);
    expect(vec).toEqual(copy);
  });
});

describe("numbersToPgVectorLiteral", () => {
  it("formats a vector as a pgvector literal", () => {
    expect(numbersToPgVectorLiteral([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
  });

  it("returns an empty bracketed literal for an empty vector", () => {
    expect(numbersToPgVectorLiteral([])).toBe("[]");
  });

  it("substitutes 0 for non-finite values to keep pgvector parseable", () => {
    expect(numbersToPgVectorLiteral([1, NaN, Infinity, -Infinity, 2])).toBe(
      "[1,0,0,0,2]"
    );
  });
});
