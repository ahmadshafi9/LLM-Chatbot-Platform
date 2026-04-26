-- Add uploaded_by to scope chunks by uploader.
alter table course_chunks
  add column if not exists uploaded_by text;

-- Drop the old 3-arg signature from 005 and replace with 4-arg version.
drop function if exists match_course_chunks(vector(768), int, uuid);

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
  where (p_group_id    is null or c.group_id    = p_group_id)
    and (p_uploaded_by is null or c.uploaded_by = p_uploaded_by)
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 5), 50));
$$;

grant execute on function match_course_chunks(vector(768), int, uuid, text) to service_role;
