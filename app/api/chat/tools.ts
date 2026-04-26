import { tool } from "ai";
import { z } from "zod";

import { searchCourseMaterials } from "@/lib/ai/course-search";

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
 * Returns a lookup_course_materials tool scoped to the given group.
 * Pass groupId=null to search across all groups (general mode).
 */
export function createLookupTool(groupId?: string | null) {
  return tool({
    description:
      "Search course materials (PDFs and indexed class content). Use when the user asks about lectures, homework, topics covered in their course PDFs, or anything answerable from their uploaded course documents—not for general web trivia.",
    inputSchema: z.object({
      course_search_terms: z
        .string()
        .describe(
          "Search query for the vector DB (e.g. 'midterm date', 'LU factorization')."
        ),
    }),
    execute: async ({ course_search_terms }) => {
      try {
        const results = await searchCourseMaterials(
          course_search_terms,
          5,
          groupId ?? null
        );
        return JSON.stringify({ query: course_search_terms, chunks: results });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Course search failed.";
        return JSON.stringify({
          error: message,
          query: course_search_terms,
          chunks: [],
        });
      }
    },
  });
}

// Convenience export: searches across all groups
export const lookup_course_materials = createLookupTool(null);