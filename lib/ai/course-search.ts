import { queryEmbeddings } from "@/lib/ai/embedding-query";
import { getServiceSupabase } from "@/lib/supabase/server";
import {
  numbersToPgVectorLiteral,
  truncateEmbeddingForStore,
} from "@/lib/supabase/vector";

export type CourseChunkResult = {
  id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  distance: number;
};

export async function searchCourseMaterials(
  query: string,
  topK = 5,
  groupId?: string | null,
  uploadedBy?: string | null
): Promise<CourseChunkResult[]> {
  const supabase = getServiceSupabase();
  const vector = await queryEmbeddings.embedQuery(query.trim());
  const query_embedding = numbersToPgVectorLiteral(
    truncateEmbeddingForStore(vector)
  );
  const { data, error } = await supabase.rpc("match_course_chunks", {
    query_embedding,
    match_count: topK,
    p_group_id: groupId ?? null,
    p_uploaded_by: uploadedBy ?? null,
  });
  if (error) throw error;
  const rows = data ?? [];
  return rows.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    content: String(row.content ?? ""),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    distance: Number(row.distance ?? 0),
  }));
}
