-- Run this in the Supabase SQL Editor (or use Supabase CLI migrations) after creating a project.
-- Milestone 1: course chunks + pgvector similarity search.

create extension if not exists vector;

create table if not exists course_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(768) not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table course_chunks enable row level security;

-- Cosine distance: use <=> with a cosine-indexed column (see optional index below).
create or replace function match_course_chunks (
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  id uuid,
  content text,
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
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 50));
$$;

grant execute on function match_course_chunks(vector(768), int) to service_role;

-- Optional: create after you have a few thousand rows for faster ANN search.
-- create index if not exists course_chunks_embedding_cosine
--   on course_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
