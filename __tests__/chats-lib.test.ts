import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for lib/supabase/chats.ts.
 * Mocks Supabase so no real DB calls are made.
 */

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: () => ({ from: mockFrom }),
}));

const {
  getAllChats,
  insertChat,
  insertChatMessage,
  getChatMessages,
  deleteChat,
  migrateChatOwner,
} = await import("@/lib/supabase/chats");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAllChats", () => {
  it("scopes the query to ownerId and maps rows to camelCase", async () => {
    const limit = vi
      .fn()
      .mockResolvedValue({
        data: [{ chat_id: 1, title: "T", group_name: "G" }],
        error: null,
      });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const chats = await getAllChats("owner-1");

    expect(mockFrom).toHaveBeenCalledWith("chats");
    expect(select).toHaveBeenCalledWith("chat_id, title, group_name");
    expect(eq).toHaveBeenCalledWith("owner_id", "owner-1");
    expect(order).toHaveBeenCalledWith("chat_id", { ascending: false });
    expect(chats).toEqual([{ chatId: 1, title: "T", group_name: "G" }]);
  });

  it("returns [] when supabase returns null data", async () => {
    const limit = vi.fn().mockResolvedValue({ data: null, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    expect(await getAllChats("o")).toEqual([]);
  });

  it("throws when supabase returns an error", async () => {
    const limit = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error("db down") });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    await expect(getAllChats("o")).rejects.toThrow("db down");
  });
});

describe("insertChat", () => {
  it("truncates long titles to 60 chars with ellipsis", async () => {
    let captured: { title: string; group_name: string | null; owner_id: string } | undefined;
    const single = vi.fn().mockResolvedValue({ data: { chat_id: 7 }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockImplementation((row) => {
      captured = row;
      return { select };
    });
    mockFrom.mockReturnValue({ insert });

    const longTitle = "x".repeat(120);
    const id = await insertChat(longTitle, null, "owner-1");

    expect(id).toBe(7);
    expect(captured?.title).toHaveLength(58); // 57 chars + ellipsis = 58 code points
    expect(captured?.title.endsWith("…")).toBe(true);
    expect(captured?.group_name).toBeNull();
    expect(captured?.owner_id).toBe("owner-1");
  });

  it("collapses whitespace in titles", async () => {
    let captured: { title: string } | undefined;
    const single = vi.fn().mockResolvedValue({ data: { chat_id: 1 }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockImplementation((row) => {
      captured = row;
      return { select };
    });
    mockFrom.mockReturnValue({ insert });

    await insertChat("  hello   world\n\nfoo  ", null, "o");
    expect(captured?.title).toBe("hello world foo");
  });

  it("propagates supabase errors", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error("nope") });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });

    await expect(insertChat("t", null, "o")).rejects.toThrow("nope");
  });
});

describe("insertChatMessage", () => {
  it("inserts a chat message", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert });

    await insertChatMessage(42, "hello", "user");
    expect(insert).toHaveBeenCalledWith({ chat_id: 42, message: "hello", role: "user" });
  });

  it("throws on supabase error", async () => {
    const insert = vi.fn().mockResolvedValue({ error: new Error("boom") });
    mockFrom.mockReturnValue({ insert });
    await expect(insertChatMessage(1, "m", "user")).rejects.toThrow("boom");
  });
});

describe("getChatMessages", () => {
  it("orders ascending by created_at and maps rows", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          message_id: 1,
          chat_id: 9,
          message: "hi",
          role: "user",
          created_at: "2026-01-01",
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const msgs = await getChatMessages(9);

    expect(eq).toHaveBeenCalledWith("chat_id", 9);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(msgs).toEqual([
      { messageId: 1, chatId: 9, message: "hi", role: "user", created_at: "2026-01-01" },
    ]);
  });
});

describe("deleteChat", () => {
  it("deletes only when both chatId and ownerId match", async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: null });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const del = vi.fn().mockReturnValue({ eq: eq1 });
    mockFrom.mockReturnValue({ delete: del });

    await deleteChat(5, "owner-1");
    expect(eq1).toHaveBeenCalledWith("chat_id", 5);
    expect(eq2).toHaveBeenCalledWith("owner_id", "owner-1");
  });

  it("propagates supabase errors", async () => {
    const eq2 = vi.fn().mockResolvedValue({ error: new Error("denied") });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const del = vi.fn().mockReturnValue({ eq: eq1 });
    mockFrom.mockReturnValue({ delete: del });

    await expect(deleteChat(5, "o")).rejects.toThrow("denied");
  });
});

describe("migrateChatOwner", () => {
  it("returns the count of rows migrated", async () => {
    const select = vi.fn().mockResolvedValue({
      data: [{ chat_id: 1 }, { chat_id: 2 }, { chat_id: 3 }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    const count = await migrateChatOwner("anonymous", "user_xyz");
    expect(update).toHaveBeenCalledWith({ owner_id: "user_xyz" });
    expect(eq).toHaveBeenCalledWith("owner_id", "anonymous");
    expect(count).toBe(3);
  });

  it("returns 0 when no rows match", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    expect(await migrateChatOwner("a", "b")).toBe(0);
  });
});
