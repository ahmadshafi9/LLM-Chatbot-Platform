import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration-style tests for the groups API route.
 * Mocks Supabase so no real DB calls are made.
 */

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: () => ({
    from: mockFrom,
  }),
}));

// Helper to build chainable mock that returns values at the end
function buildChain(finalValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalValue),
    eq: vi.fn().mockResolvedValue(finalValue),
  };
  return chain;
}

const { GET, POST } = await import("@/app/api/groups/route");

describe("GET /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no groups exist", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns groups from Supabase", async () => {
    const groups = [{ id: "uuid-1", name: "CMPT 276", slug: "cmpt-276", description: "", created_at: "2026-01-01" }];
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: groups, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("CMPT 276");
  });

  it("returns 500 on Supabase error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB exploded" } }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB exploded");
  });
});

describe("POST /api/groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeRequest({ description: "No name" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name/i);
  });

  it("creates group and returns 201", async () => {
    const created = { id: "uuid-2", name: "CMPT 276", slug: "cmpt-276", description: "", created_at: "2026-01-01" };
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: created, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await POST(makeRequest({ name: "CMPT 276" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe("cmpt-276");
  });

  it("auto-generates slug from name", async () => {
    let capturedInsert: unknown;
    const chain = {
      insert: vi.fn().mockImplementation((val) => { capturedInsert = val; return chain; }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "x", name: "Data Structures", slug: "data-structures", description: "", created_at: "" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    await POST(makeRequest({ name: "Data Structures" }));
    expect((capturedInsert as { slug: string }).slug).toBe("data-structures");
  });

  it("returns 409 on duplicate slug", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "23505", message: "unique violation" } }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await POST(makeRequest({ name: "CMPT 276" }));
    expect(res.status).toBe(409);
  });
});
