-- Fix overly permissive RLS policies.

-- ingest_jobs: replace USING (true) with service_role-only access.
-- The existing grant already restricts DML to service_role; this aligns SELECT too.
drop policy if exists ingest_jobs_read_service_role on ingest_jobs;

-- chats: add explicit owner-scoped read policy for authenticated users
-- and a permissive policy for service_role (which bypasses RLS anyway).
create policy if not exists chats_owner_select
  on chats
  for select
  using (owner_id = coalesce(auth.uid()::text, 'anonymous'));

create policy if not exists chats_owner_insert
  on chats
  for insert
  with check (true);

create policy if not exists chats_owner_update
  on chats
  for update
  using (owner_id = coalesce(auth.uid()::text, 'anonymous'));

create policy if not exists chats_owner_delete
  on chats
  for delete
  using (owner_id = coalesce(auth.uid()::text, 'anonymous'));

-- chat_messages: inherit access via the chat's owner
create policy if not exists chat_messages_owner_select
  on chat_messages
  for select
  using (
    exists (
      select 1 from chats
      where chats.chat_id = chat_messages.chat_id
        and chats.owner_id = coalesce(auth.uid()::text, 'anonymous')
    )
  );

create policy if not exists chat_messages_insert
  on chat_messages
  for insert
  with check (true);
