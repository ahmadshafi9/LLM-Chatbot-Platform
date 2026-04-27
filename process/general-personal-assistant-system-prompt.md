# Generalize Chatbot from Course Assistant to Personal Assistant

## What changed

The chatbot was originally framed around SFU course materials — its system prompt said "you are an assistant for the CMPT 276 course", the lookup tool was called `lookup_course_materials`, and all copy referred to lectures, PDFs, and course documents.

This change reframes it as a general-purpose personal assistant that happens to support document upload.

## Files touched

### `app/api/chat/route.ts`
- `docListLine` copy: "indexed for this course" → "available to search" / "No documents uploaded yet"
- System prompt: removed course framing entirely. New prompt positions the bot as a smart personal assistant that helps with anything — writing, coding, research, math, brainstorming — and uses uploaded documents when relevant.
- Tool registration key: `lookup_course_materials` → `lookup_documents`

### `app/api/chat/tools.ts`
- Renamed `createLookupTool` export alias from `lookup_course_materials` to `lookup_documents`
- Tool description: removed all course/lecture/homework language. Now says "user's uploaded documents (PDFs, notes, reports)"
- Input field: `course_search_terms` → `search_terms` (the schema field name the model sees)

### `app/chat-client.tsx`
- UI label switch: `case "lookup_course_materials"` → `case "lookup_documents"` with updated human-readable strings ("Read uploaded documents", etc.)

## Decisions

- Kept the workspace/group name in the system prompt (`"${groupName}" workspace`) so group context still surfaces naturally without being course-specific.
- Did NOT rename the underlying Supabase function (`match_course_chunks`) or the `searchCourseMaterials` lib function — those are internal implementation details the model never sees, and renaming them would require a migration.
- Process docs in `process/` were not updated (they document historical decisions, not current state).

## How to verify

1. Start the dev server (`npm run dev`)
2. Open a chat with no group selected — system prompt should feel like a general assistant
3. Open a chat with a group selected — should say "... in the 'CMPT 276 AI' workspace" but not feel course-locked
4. Upload a PDF and ask about it — tool label in UI should say "Looking up documents…"
