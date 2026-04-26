-- Ingest job tracking for async "upload -> embed -> index" pipeline.

create table if not exists ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  -- Unique key per uploaded PDF content; used for deduping re-uploads.
  ingest_hash text not null unique,

  status text not null default 'queued'
    check (status in (
      'queued',
      'processing',
      'done',
      'failed',
      'rejected_too_many_pages'
    )),

  source_label text not null,
  filename text not null,

  page_count int,
  extracted_text_length int,
  chunks_inserted int,
  low_text_warning boolean,

  error_text text
);

-- Helpful index for polling / lookups.
create index if not exists ingest_jobs_created_at_idx on ingest_jobs(created_at desc);

alter table ingest_jobs enable row level security;

-- Keep ingest_jobs internal (service-role only for now).
-- If you later add auth/RLS, tighten these policies.
create policy if not exists ingest_jobs_read_service_role
  on ingest_jobs
  for select
  using (true);

