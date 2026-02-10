import { tool } from "ai";
import { z } from "zod";

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

export const search_web = tool({
  description:
    "Search the web for current or factual information. Use this when the user asks about recent events, real-world facts, news, or anything that might need up-to-date information. Provide clear search terms as a single string.",
  inputSchema: z.object({
    search_terms: z
      .string()
      .describe("The search query (e.g. 'weather London', 'latest news AI')"),
  }),
  execute: async ({ search_terms }) => {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey?.trim()) {
      return JSON.stringify({
        error: "Web search is not configured (missing BRAVE_API_KEY).",
        results: [],
      });
    }

    const params = new URLSearchParams({
      q: search_terms.trim(),
      count: "5",
    });

    try {
      const res = await fetch(`${BRAVE_API_URL}?${params}`, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      });

      const data = (await res.json()) as {
        web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
        message?: string;
      };

      if (!res.ok) {
        const msg = data?.message || res.statusText || "Search request failed";
        return JSON.stringify({ error: msg, results: [] });
      }

      const results = data?.web?.results ?? [];
      const summary = results.map((r, i) => ({
        index: i + 1,
        title: r.title ?? "",
        url: r.url ?? "",
        description: r.description ?? "",
      }));

      return JSON.stringify({
        query: search_terms,
        total: summary.length,
        results: summary,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return JSON.stringify({
        error: `Web search failed: ${message}`,
        results: [],
      });
    }
  },
});
