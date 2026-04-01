/** Must match `course_chunks.embedding` / `match_course_chunks` in SQL (768). */
export const STORED_EMBEDDING_DIM = 768;

/**
 * Voyage voyage-3-large returns 1024-d (or other) vectors; leading components are valid Matryoshka slices for smaller k.
 */
export function truncateEmbeddingForStore(vec: number[], dim = STORED_EMBEDDING_DIM): number[] {
  if (vec.length <= dim) return vec;
  return vec.slice(0, dim);
}

/** pgvector literal for Supabase / PostgREST: `"[0.1,0.2,...]"` */
export function numbersToPgVectorLiteral(vec: number[]): string {
  return `[${vec.map((n) => (Number.isFinite(n) ? String(n) : "0")).join(",")}]`;
}
