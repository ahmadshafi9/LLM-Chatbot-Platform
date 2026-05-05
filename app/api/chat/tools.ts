import { tool } from "ai";
import { z } from "zod";

import { searchCourseMaterials } from "@/lib/ai/course-search";
import { rerankChunks } from "@/lib/ai/rerank";

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

/**
 * Returns a lookup_documents tool scoped to the given group.
 * Pass groupId=null to search across all groups.
 */
export function createLookupTool(groupId?: string | null, uploadedBy?: string | null) {
  return tool({
    description:
      "Search the user's uploaded documents (PDFs, notes, reports, or any indexed files). Use when the user asks about something that might be in their files — not for general web facts or current events.",
    inputSchema: z.object({
      search_terms: z
        .string()
        .describe(
          "Search query for the vector DB (e.g. 'project deadline', 'budget summary', 'chapter 3 notes')."
        ),
    }),
    execute: async ({ search_terms }) => {
      try {
        // Fetch more candidates than needed so re-rank has room to filter.
        const candidates = await searchCourseMaterials(
          search_terms,
          15,
          groupId ?? null,
          uploadedBy ?? null
        );
        const reranked = (await rerankChunks(search_terms, candidates)).slice(0, 5);
        const chunks = reranked.map((c) => {
          const meta = (c.metadata ?? {}) as Record<string, unknown>;
          const sourceLabel =
            (typeof meta.source_label === "string" && meta.source_label) ||
            (typeof meta.source === "string" && meta.source) ||
            (typeof meta.file_name === "string" && meta.file_name) ||
            null;
          return {
            content: c.content,
            source: sourceLabel,
            relevance_score:
              typeof c.relevance_score === "number"
                ? Number(c.relevance_score.toFixed(3))
                : null,
          };
        });
        return JSON.stringify({ query: search_terms, chunks });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Document search failed.";
        return JSON.stringify({
          error: message,
          query: search_terms,
          chunks: [],
        });
      }
    },
  });
}

// Convenience export: searches across all groups
export const lookup_documents = createLookupTool(null);
