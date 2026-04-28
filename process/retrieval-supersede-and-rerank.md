# Retrieval accuracy: supersede + Voyage rerank

## What changed

Two independent retrieval-quality improvements were added to the document lookup pipeline:

1. **Supersede** — old uploads of the same file no longer pollute search results when a newer version is uploaded.
2. **Voyage rerank** — vector search now fetches 15 candidates and routes them through Voyage's cross-encoder rerank API before returning the top 5 to the LLM.

Together these address the two most common accuracy failures: (a) stale/duplicate chunks from re-uploads, and (b) chunks that score high on cosine similarity but aren't actually the best answer.

## New retrieval pipeline

```
upload → supersede prior same-source jobs
       ↓
       (queries)
       ↓
embed query (Voyage voyage-3-large, 768d)
       ↓
pgvector cosine search → 15 candidates
   (match_course_chunks LEFT JOINs ingest_jobs and skips
    chunks belonging to a job with superseded_by IS NOT NULL)
       ↓
Voyage /rerank (rerank-2, cross-encoder)
   filter score < 0.1, sort by relevance, take top 5
       ↓
top 5 chunks injected into LLM context
```

## Files touched

### `supabase/migrations/009_supersede_and_job_fk.sql` (new)
- Adds `superseded_by uuid REFERENCES ingest_jobs(id)` to `ingest_jobs`. Indexed on the non-null path.
- Adds `ingest_job_id uuid REFERENCES ingest_jobs(id)` to `course_chunks`. Indexed.
- Backfills `course_chunks.ingest_job_id` from existing `metadata->>'ingest_job_id'` so legacy rows participate in the supersede filter.
- Replaces `match_course_chunks(vector(768), int, uuid, text)` with a version that LEFT JOINs `ingest_jobs` and excludes chunks whose job has been superseded. Chunks with `ingest_job_id IS NULL` (very old legacy rows that predate metadata tracking) are always included so we never silently drop them.

### `app/api/documents/upload/route.ts`
- After inserting a brand-new ingest job, marks all prior `done` jobs with the same `source_label`/`group_id`/`uploaded_by` as `superseded_by = newJobId`.
- Filters use `eq` for non-null fields and `is(null)` for null fields explicitly. Earlier draft used `.match({...})` with conditional spread, which silently dropped the filter when `groupId`/`uploadedBy` was null and would have superseded jobs from other groups.
- Only runs on the brand-new-job path. Re-uploads of the *same* file (same content hash) still hit the existing dedupe branch and don't trigger supersede.

### `lib/ingest/process-pdf.ts`
- Each chunk now writes `ingest_job_id` as a real column (in addition to the existing `metadata.ingest_job_id`). The hard column is what the SQL JOIN reads — querying `metadata->>'ingest_job_id'` on every retrieval would be slow.

### `lib/ai/rerank.ts` (new)
- POSTs to `https://api.voyageai.com/v1/rerank` with the query and chunk contents, model `rerank-2`, `truncation: true`.
- Drops chunks scoring below `RERANK_THRESHOLD = 0.1`, sorts by `relevance_score` desc, returns the matching `CourseChunkResult` objects.
- Silently falls back to original vector-search order on any failure (network error, non-2xx, missing API key, malformed response). Retrieval never breaks because of rerank.

### `app/api/chat/tools.ts`
- `createLookupTool.execute` now fetches 15 candidates from `searchCourseMaterials` instead of 5, pipes them through `rerankChunks`, and slices to 5 before serialising for the model.

## Decisions

- **Why supersede instead of delete-on-same-name?** Old chunks stay in the DB so we have a rollback path and audit trail. The cutover is also atomic — the old chunks keep serving until the new job's status flips to `done`, and the SQL filter starts excluding them in the same transaction the new job's chunks become queryable. Storage cost is minimal at this scale.
- **Why a hard `ingest_job_id` column instead of joining on `metadata->>'ingest_job_id'`?** JSONB text extraction is not indexable cheaply and runs on every retrieval. A real FK column with a btree index keeps the LEFT JOIN fast.
- **Why Voyage `rerank-2` and not LLM scoring via OpenRouter?** Cross-encoders are trained specifically for retrieval relevance; an LLM doing scoring is a general reasoner improvising. Voyage rerank is more accurate per dollar, faster, and uses the API key we already have. The user explicitly opted to pay for rerank to get accuracy.
- **Why `rerank-2` over `rerank-2-lite`?** Accuracy is the whole point of this change. Lite is faster but less accurate; if latency becomes an issue we can switch.
- **Why threshold 0.1 (loose)?** Voyage relevance scores are 0–1 but the distribution is noisy at the bottom; 0.1 cuts off only the truly irrelevant chunks while letting marginal-but-possibly-useful ones through. The LLM is good at ignoring weak context. We can tighten this later if hallucinations show up.
- **Supersede only fires on brand-new jobs.** If the same hash is re-uploaded (dedupe path), nothing happens — this is correct, the existing chunks are still the right answer. If a *failed* job is retried, supersede also doesn't fire — also correct, there are no successful prior chunks to invalidate.
- **Group/uploader scoping is preserved end to end.** Vector search filters by group_id and uploaded_by; supersede filter respects those same dimensions; rerank operates only on the already-scoped 15 candidates. No cross-tenant leakage.

## What this does NOT solve

- **Different-named files covering overlapping topics** (`week3_notes.pdf` and `week3_slides.pdf` both covering Big O). Rerank will surface the best chunk from either, but it can't know one is more authoritative without metadata tagging. Out of scope.
- **Sparse / scanned PDFs with low text extraction.** Already flagged via `low_text_warning` on the ingest job; rerank can't conjure relevance from missing text.
- **Cross-document contradiction reasoning.** If two non-superseded sources say different things, both can end up in the top 5. The LLM has to reconcile in prose. Tagging documents with authority levels is a separate feature.

## How to verify

1. Run `supabase/migrations/009_supersede_and_job_fk.sql` in the Supabase SQL editor. Confirm `ingest_jobs.superseded_by` and `course_chunks.ingest_job_id` columns exist and the new `match_course_chunks` is in place.
2. Push the code to Vercel (no new env vars needed — uses existing `VOYAGEAI_API_KEY`).
3. **Supersede check:**
   - Upload `test.pdf`, wait for status `done`.
   - Upload a different PDF saved as `test.pdf` (same filename, different content).
   - In Supabase, query `select id, source_label, status, superseded_by from ingest_jobs order by created_at desc limit 5` — old job's `superseded_by` should be the new job's id.
   - Ask the bot something only the old version contained — it should not find it. Ask something only the new version contains — it should.
4. **Rerank check:**
   - Ask a question that returns chunks via `lookup_documents`.
   - In Vercel logs, look for an outbound POST to `api.voyageai.com/v1/rerank` per lookup.
   - If you temporarily break the API key, retrieval should still return results (silent fallback to vector order).
5. **Legacy chunk check:**
   - Old chunks predating this migration get `ingest_job_id` backfilled from metadata. They participate in the supersede filter.
   - Very old chunks with no `ingest_job_id` in metadata at all stay queryable indefinitely (the SQL has an `OR c.ingest_job_id IS NULL` clause). Acceptable trade-off — they can't be superseded but also can't be hidden.
