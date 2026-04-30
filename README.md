# LLM Chatbot Platform

A Next.js chatbot app with course-aware retrieval, PDF ingestion, chat history, and Supabase-backed storage.

## Live app

Use the deployed app here: [https://myai-roan.vercel.app/](https://myai-roan.vercel.app/)

## What it does

- Creates course groups and a general chat workspace.
- Uploads PDF course materials and indexes them for retrieval-augmented generation (RAG).
- Answers with OpenRouter and can optionally search the web through Brave.
- Stores chats, chat messages, ingest jobs, and vectorized course chunks in Supabase.
- Supports sign-in with Supabase Auth and lets users scope retrieval to `Everyone` or `Mine only`.
- Supersedes older uploads of the same document so retrieval prefers the latest indexed version.

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
