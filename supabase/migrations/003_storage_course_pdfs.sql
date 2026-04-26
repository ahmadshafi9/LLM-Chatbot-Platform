-- Private bucket for uploaded course PDFs (server uploads via service role).
-- Run in Supabase SQL Editor if migrations are applied manually.

insert into storage.buckets (id, name, public)
values ('course-pdfs', 'course-pdfs', false)
on conflict (id) do nothing;
