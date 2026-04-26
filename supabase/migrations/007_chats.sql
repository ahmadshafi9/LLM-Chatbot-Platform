-- Move chat history from SQLite to Supabase.

create table if not exists chats (
  chat_id   bigint generated always as identity primary key,
  title     text    not null,
  group_name text,
  owner_id  text,
  created_at timestamptz default now()
);

create index if not exists chats_owner_id_idx on chats (owner_id);

alter table chats enable row level security;
grant all on chats to service_role;
grant usage, select on sequence chats_chat_id_seq to service_role;

-- ──────────────────────────────────────────────────────────
create table if not exists chat_messages (
  message_id bigint generated always as identity primary key,
  chat_id    bigint not null references chats(chat_id) on delete cascade,
  message    text   not null,
  role       text   not null default 'user',
  created_at timestamptz default now()
);

create index if not exists chat_messages_chat_id_idx on chat_messages (chat_id);

alter table chat_messages enable row level security;
grant all on chat_messages to service_role;
grant usage, select on sequence chat_messages_message_id_seq to service_role;

-- ──────────────────────────────────────────────────────────
-- Track who uploaded each PDF (for "mine only" filtering on the doc list)
alter table ingest_jobs
  add column if not exists uploaded_by text;
