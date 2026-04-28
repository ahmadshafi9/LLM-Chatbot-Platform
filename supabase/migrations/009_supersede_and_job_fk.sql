-- Migration 009: supersede tracking + ingest_job_id FK on course_chunks
-- Allows filtering out chunks from superseded ingest jobs during retrieval.

-- 1. Track which job superseded which.
alter table ingest_jobs
  add column if not exists superseded_by uuid references ingest_jobs(id) on delete set null;

create index if not exists ingest_jobs_superseded_by_idx
  on ingest_jobs (superseded_by)
  where superseded_by is not null;

-- 2. Hard FK column on course_chunks so the SQL join is fast.
--    Chunks already store ingest_job_id in metadata jsonb, but joins on jsonb text fields are slow.
alter table course_chunks
  add column if not exists ingest_job_id uuid references ingest_jobs(id) on delete cascade;

create index if not exists course_chunks_ingest_job_id_idx
  on course_chunks (ingest_job_id);

-- 3. Backfill the new column from existing metadata for any rows that have it.
--    Skip rows where metadata->>'ingest_job_id' is not a valid UUID (e.g. test
--    fixtures like "test-job-id-999"). Those rows will be treated as legacy
--    and stay queryable via the `c.ingest_job_id IS NULL` branch in the RPC.
update course_chunks
  set ingest_job_id = (metadata->>'ingest_job_id')::uuid
  where ingest_job_id is null
    and metadata->>'ingest_job_id' is not null
    and metadata->>'ingest_job_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Replace match_course_chunks to exclude superseded chunks.
drop function if exists match_course_chunks(vector(768), int, uuid, text);

create or replace function match_course_chunks (
  query_embedding  vector(768),
  match_count      int     default 5,
  p_group_id       uuid    default null,
  p_uploaded_by    text    default null
)
returns table (
  id       uuid,
  content  text,
  metadata jsonb,
  distance double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.content,
    c.metadata,
    (c.embedding <=> query_embedding)::double precision as distance
  from course_chunks c
  -- Exclude chunks whose ingest job has been superseded by a newer upload.
  -- Chunks with no ingest_job_id (legacy rows) are always included.
  left join ingest_jobs j on j.id = c.ingest_job_id
  where (p_group_id    is null or c.group_id    = p_group_id)
    and (p_uploaded_by is null or c.uploaded_by = p_uploaded_by)
    and (c.ingest_job_id is null or j.superseded_by is null)
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 50));
$$;

grant execute on function match_course_chunks(vector(768), int, uuid, text) to service_role;
