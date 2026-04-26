# Groups / Multi-AI System — Process & Decision Log

**Date:** 2026-04-15  
**Status:** Code complete; Supabase migration 005 still needs to be applied

---

## What is the "Groups" feature?

The Groups feature lets users create named "AIs" (e.g. "CMPT 276 AI", "CMPT 372 AI").  
Each group has its own scoped vector index in Supabase — course PDFs uploaded under a group only show up in RAG searches for that group.  
In the sidebar a user picks a group, and every message + document upload is tagged to it.

---

## The Bug You're Hitting

**Error:** `could not find the table public.groups in the schema`

**Root cause:** The SQL migration that creates the `groups` table hasn't been run against your Supabase project yet.

**The migration file:** `supabase/migrations/005_groups.sql`

---

## How to Fix It (Step by Step)

1. Open your Supabase project dashboard → go to **SQL Editor**
2. Open the file `supabase/migrations/005_groups.sql` in this repo
3. Copy its entire contents and paste them into the SQL Editor
4. Click **Run**
5. You should see no errors — the table `groups`, new columns on `course_chunks` and `ingest_jobs`, and a new `match_course_chunks` function will all be created

After that, clicking `+` in the sidebar should work.

---

## Every File That Was Touched (and Why)

### `supabase/migrations/005_groups.sql`

**What it does:**
- Creates the `groups` table with columns: `id` (UUID), `name`, `slug`, `description`, `created_at`
- Adds a `slug_unique` constraint so two groups can't have the same URL-friendly name
- Enables Row Level Security (RLS) on `groups` — only the `service_role` (your server) can read/write, not anonymous clients
- Adds a `group_id` foreign key column to `course_chunks` — every chunk of a PDF is now stamped with which group it belongs to
- Adds a `group_id` foreign key column to `ingest_jobs` — when you upload a PDF, the job is linked to the group
- Drops the old `match_course_chunks` function (which took 2 args) and replaces it with a new one that takes 3 args: the query embedding, match count, and an optional `p_group_id`
- The new function filters chunks by group if a group ID is given, otherwise returns all chunks (general/no-group mode)

**Decision — why `slug`?**  
Slugs are URL-safe, lowercase, hyphenated identifiers (e.g. "cmpt-276-ai"). They let us reference groups in URLs and API calls without encoding issues. The API auto-generates a slug from the name if you don't provide one.

**Decision — why RLS?**  
Supabase exposes tables to the internet by default. Without RLS or explicit grants, anyone with your project URL could read/write groups. Enabling RLS and granting only `service_role` means only your Next.js backend (which holds the `SERVICE_ROLE_KEY`) can touch the table.

---

### `app/api/groups/route.ts`

Two endpoints:

**GET `/api/groups`**  
Fetches all groups ordered by creation time. Used by the sidebar on page load.

**POST `/api/groups`**  
Creates a new group. Accepts `{ name, slug?, description? }`.  
- Auto-generates slug from name if not provided
- Returns 409 Conflict if a group with that slug already exists (Postgres unique constraint violation code `23505`)

**Decision — why `service_role` Supabase client?**  
RLS is enabled on `groups`, so a normal `anon` key would be blocked. The server-side route uses `getServiceSupabase()` which injects the `SERVICE_ROLE_KEY` and bypasses RLS.

---

### `app/chat-client.tsx` (sidebar UI)

**What was added:**
- `Group` interface (id, name, slug, description)
- `groups` state array + `selectedGroup` state
- `loadGroups()` — fetches `/api/groups` on mount
- `handleCreateGroup()` — POSTs to `/api/groups`, adds result to list, auto-selects the new group
- A "Select AI" panel in the sidebar with:
  - "General" button (selectedGroup = null, no scoping)
  - One button per group
  - An input + `+` button to create a new group inline
  - Error message if creation fails
- `selectedGroup` is passed in every chat message body as `{ groupId, groupName }` so the server knows which group to scope RAG to
- PDF upload also passes `groupId` in the FormData so chunks are tagged to the right group

**Decision — why auto-select the new group after creation?**  
UX: if you just created "CMPT 276 AI", you almost certainly want to immediately start chatting with it or upload PDFs to it. Auto-selecting saves a click.

**Decision — why pass `groupName` to the chat API?**  
The AI can use the group name in its system prompt ("You are the CMPT 276 AI…") without having to do a database lookup to resolve the UUID to a human name.

---

### `app/api/chat/route.ts` (chat backend)

The chat API reads `groupId` and `groupName` from the request body and:
- Scopes vector search to the group when calling `match_course_chunks`
- Optionally injects the group name into the system prompt

---

### `lib/ai/course-search.ts`

The `lookup_course_materials` tool was updated to accept an optional `groupId` parameter and pass it to the Supabase RPC call (`match_course_chunks`).

---

## How It All Hangs Together (Data Flow)

```
User types in input box
  → sendMessage({ text }, { body: { chatId, groupId, groupName } })
  → POST /api/chat
    → builds system prompt mentioning groupName
    → when AI calls lookup_course_materials:
        → calls match_course_chunks(embedding, 5, groupId)
        → Supabase only returns chunks where group_id = groupId
    → streams response back

User clicks + to create group
  → POST /api/groups { name }
  → 005_groups migration must already have run for this to work
  → groups table gets a new row
  → UI adds it to the list and auto-selects it

User uploads PDF
  → POST /api/documents/upload (FormData: file, groupId)
  → ingest job created, tagged with groupId
  → PDF is chunked + embedded
  → each chunk inserted into course_chunks with group_id = groupId
```

---

## Debugging Guide

### "could not find the table public.groups"
→ Run migration 005 in Supabase SQL Editor (see Fix section above)

### "A group with slug X already exists" (409)
→ Pick a different name. Slugs must be unique. Or delete the old group from Supabase Table Editor.

### Groups list is empty on load
→ Open browser DevTools → Network → look for `/api/groups` response
→ If 500: check server logs for Supabase errors (probably missing table or bad env vars)
→ If 200 but empty array: migration ran but no groups created yet — that's correct

### PDF uploads not scoping to the right group
→ Check that `groupId` appears in the FormData when uploading (DevTools → Network → request body)
→ Check `ingest_jobs` table in Supabase — `group_id` column should be set
→ Check `course_chunks` table — `group_id` should match

### Chat not finding group-specific documents
→ Add a `console.log` in `lib/ai/course-search.ts` to verify `groupId` is being passed to the Supabase RPC call

---

## Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   ← required for groups (RLS bypass)
```

All three must be in `.env.local`.

---

## What's NOT Done Yet

- **Login page is unrouted** — there's a login page in the codebase but it's not wired up to any auth system yet. Groups are currently not tied to users — anyone who opens the app sees all groups.
- **No delete group UI** — you can delete groups via Supabase Table Editor for now
- **No group editing** — name/description can only be changed directly in the database
