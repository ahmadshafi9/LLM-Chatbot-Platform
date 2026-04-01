-- Run only if you already applied 001 with vector(768). Otherwise use 001 as-is.
-- Supabase SQL Editor:

-- alter table course_chunks alter column embedding type vector(1024);

-- Or wipe and re-run 001_course_chunks.sql from scratch (drops data):

-- drop table if exists course_chunks cascade;
-- drop function if exists match_course_chunks(vector(768), int);
-- then re-run 001_course_chunks.sql
