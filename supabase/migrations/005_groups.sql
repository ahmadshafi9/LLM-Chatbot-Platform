-- Multi-tenant group system.
-- Each group represents an "AI" (e.g. CMPT 276 AI) with its own scoped vector index.
-- Users pick a group in the UI; all document uploads and searches are scoped to it.

create table if not exists groups (
  id          uuid    primary key default gen_random_uuid(),
  name        text    not null,
  slug        text    not null,
  description text    not null default '',
  created_at  timestamptz default now(),
  constraint groups_slug_unique unique (slug)
);

alter table groups enable row level security;
grant select, insert on groups to service_role;

-- Scope course chunks to a group (null = shared/general, no group filter)
alter table course_chunks
  add column if not exists group_id uuid references groups(id) on delete cascade;

create index if not exists course_chunks_group_id_idx
  on course_chunks (group_id);

-- Scope ingest jobs to a group
alter table ingest_jobs
  add column if not exists group_id uuid references groups(id) on delete set null;

-- Drop old function signature so we can replace it with the new one that adds p_group_id
drop function if exists match_course_chunks(vector(768), int);

-- Updated: optional group scoping via p_group_id
create or replace function match_course_chunks (
  query_embedding vector(768),
  match_count     int     default 5,
  p_group_id      uuid    default null
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
  where (p_group_id is null or c.group_id = p_group_id)
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 50));
$$;

grant execute on function match_course_chunks(vector(768), int, uuid) to service_role;
