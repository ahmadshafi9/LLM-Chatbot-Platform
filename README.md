# LLM Chatbot Platform

A Next.js chatbot app with course-aware retrieval, PDF ingestion, chat history, and Supabase-backed storage.

## What it does

- Creates course groups and a general chat workspace.
- Uploads PDF course materials and indexes them for retrieval-augmented generation (RAG).
- Answers with OpenRouter and can optionally search the web through Brave.
- Stores chats, chat messages, ingest jobs, and vectorized course chunks in Supabase.
- Supports sign-in with Supabase Auth and lets users scope retrieval to `Everyone` or `Mine only`.
- Supersedes older uploads of the same document so retrieval prefers the latest indexed version.

## Tech stack

- `Next.js 16`
- `React 19`
- `ai` / `@openrouter/ai-sdk-provider`
- `Supabase` for auth, relational data, and pgvector-backed search
- `Voyage AI` embeddings
- `Brave Search API` for web search

## Requirements

- `Node.js 20.x`
- An npm-compatible environment
- A Supabase project
- API keys for OpenRouter and Voyage AI
- Optional: a Brave Search API key

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

- `OPENROUTER_API_KEY`: used by the chat API
- `VOYAGEAI_API_KEY`: used to embed uploaded PDF chunks and retrieval queries
- `SUPABASE_URL`: server-side Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase access for chat persistence and ingestion
- `NEXT_PUBLIC_SUPABASE_URL`: browser-side Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser-side Supabase key for auth

Optional variables:

- `BRAVE_API_KEY`: enables web search tool calls from the assistant

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project.

3. Apply the SQL migrations in `supabase/migrations/` to your Supabase database. The repo includes migrations for:

- vector storage in `course_chunks`
- ingest job tracking
- course groups
- chat and message persistence
- row-level security policies
- superseded document handling via `superseded_by` and `ingest_job_id`

If you use the Supabase CLI configured for this project, you can run:

```bash
npm run migrate
```

4. Start the app:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## How the app works

### Course chat

The landing page loads available groups from `/api/groups`. Users can enter a course-specific chat or use `General Chat` with no course context.

### PDF ingestion

Course PDFs are uploaded through `/api/documents/upload`. The server:

- accepts PDF files up to `25 MB`
- rejects files over `100 pages`
- deduplicates by content hash
- spawns a background ingestion job
- extracts text, splits it into chunks, generates embeddings, and stores them in `course_chunks`

Low-text PDFs are accepted, but the job is flagged so the UI can warn that scanned or image-based slides may need OCR.

### Retrieval

When a user chats in a course workspace, the assistant can call `lookup_documents` to search indexed material for that group. Results are reranked before being sent back to the model.

If a signed-in user chooses `Mine only`, retrieval is also filtered by uploader so users can search only their own uploaded materials.

### Superseding old uploads

When a newly uploaded PDF matches the same document label and scope as an older completed upload, the older job is marked as superseded. Retrieval excludes chunks from superseded jobs so answers use the latest version of the material.

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run migrate
npm run ingest -- /absolute/or/relative/path/to/file.pdf
```

`npm run ingest` is a local utility for processing a PDF from disk without going through the browser upload flow.

## API surface

- `GET /api/health`: lightweight Supabase connectivity check
- `GET /api/groups`: list course groups
- `POST /api/groups`: create a course group
- `POST /api/chat`: stream assistant responses and persist chats
- `GET /api/chat`: list chats for an owner
- `POST /api/chat/migrate`: move anonymous chats to an authenticated owner
- `POST /api/documents/upload`: upload a PDF and start ingestion
- `GET /api/documents/ingest-jobs/:id`: inspect ingest job status
- `GET /api/documents/list?group=<groupId>`: list indexed documents

## Testing

Run the test suite with:

```bash
npm run test
```

## Notes

- This app expects Supabase to be the source of truth for chats, documents, and retrieval data.
- Browser auth depends on the public Supabase keys being present.
- Web search is optional; without `BRAVE_API_KEY`, document search and direct answering still work.
