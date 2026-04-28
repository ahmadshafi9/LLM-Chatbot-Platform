import { describe, it, expect } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes by keeping the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("supports conditional object syntax", () => {
    expect(cn("a", { b: true, c: false })).toBe("a b");
  });

  it("flattens arrays of class values", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });
});
