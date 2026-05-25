## Self-Growing Knowledge Vault

Turn the Knowledge Vault from a passive folder into an active research engine. Every new piece of knowledge is auto-published, embedded for semantic search, and pushed to you as an in-app + Telegram notification with one-tap "keep / archive" controls.

## Architecture

```text
                         ┌────────────────────────────┐
[paste URL] ──────────►  │   knowledge-ingest         │ ──► documents (status='active', source='web')
[upload file] ─────────► │   (Firecrawl + parse +     │ ──► embeddings
[daily cron] ──────────► │    Lovable AI summarize)   │ ──► notification + Telegram
[meeting close] ───────► │                            │
[saved topic search] ──► └────────────────────────────┘
```

## Pieces to build

### 1. Schema (one migration)
- `knowledge_topics` — `id, user_id, label, query, frequency ('daily'), last_run_at, active`
- `documents` gets new columns: `source` (`web|upload|meeting|chat|research`), `source_url`, `summary`, `auto` boolean.
- New table `document_chunks` — `id, document_id, user_id, chunk_idx, content, embedding vector(1536), created_at`. HNSW cosine index. Enable `pgvector` extension.
- Reuse `notifications` for the per-item "approve / archive" prompts (no new table; link points at `/documents/:id`).

### 2. Edge function `knowledge-ingest` (single dispatcher)
Body shapes:
- `{ kind: "url", url }` — Firecrawl scrape (markdown + summary), insert document.
- `{ kind: "file", storage_path, mime }` — fetch file from a new `knowledge-uploads` storage bucket, run `document--parse_document` style flow via Lovable AI (PDF/DOCX/audio summarization through the gateway), insert document.
- `{ kind: "text", title, content, source }` — used internally by meeting/chat distill.
- `{ kind: "research", topic_id }` — Firecrawl `search` for the topic's query, scrape top 5, summarize each, insert one doc per hit.

For every insert it also:
1. Chunks content (~1000 chars, 150 overlap).
2. Calls Lovable AI embeddings (`openai/text-embedding-3-small`, 1536 dims).
3. Inserts rows into `document_chunks`.
4. Inserts a `notifications` row "📚 New in vault — *Title*" linking to the doc, plus a Telegram message with inline **Keep / Archive** buttons (reuses the existing `telegram-webhook` callback pattern; verbs `kdoc:keep:<id>` / `kdoc:archive:<id>` route to a tiny new function `knowledge-decision` that flips `documents.status`).

### 3. Edge function `knowledge-research-cron`
Loops over `knowledge_topics` where `active=true` and `(last_run_at IS NULL OR last_run_at < now() - interval '1 day')`, calls `knowledge-ingest` with `kind:"research"`, stamps `last_run_at`. Wired via `pg_cron` running hourly.

### 4. Edge function `knowledge-search` (semantic)
- Input: `query`, optional `limit`.
- Embeds the query, calls a new `match_document_chunks(query_embedding, match_count, _user_id)` SQL function (security definer, filters by user_id), returns top chunks with their parent document titles and similarity scores.
- Used by:
  - The new Vault search bar (frontend).
  - `jwba-room-turn` and `optimus-chat` system prompts: before each agent turn, fetch top 5 chunks for the user's message and inject as "Context from your Knowledge Vault" — this is what makes the vault *useful*, not just bigger.

### 5. Auto-distill hooks (no new functions, just calls)
- `jwba-room-save/index.ts`: after saving a room to a daily page, POST `knowledge-ingest` with `kind:"text"`, source `meeting`, content = the synthesis block.
- `optimus-chat/index.ts`: after each closed session (or every 10 turns), summarize the exchange via Lovable AI and POST `knowledge-ingest` with source `chat`.

### 6. Frontend
- **`src/pages/Documents.tsx` (Knowledge Vault)**
  - Top bar: paste-URL input, file uploader (drops into `knowledge-uploads` bucket then calls ingest), and a semantic search box.
  - Source/status filters (active / archived / auto / manual).
  - Each card shows source badge + "Keep / Archive" inline.
- **New section "Watchlist"** on the Vault page: add/remove topics that feed daily research.
- **Toaster + notifications dropdown** already exists — the new notification rows will show up automatically.

### 7. Telegram parity
- `/watch <topic>` adds a topic, `/watchlist` lists them, `/unwatch <id>` removes one.
- `/vault <query>` runs semantic search and returns top 3 with links.
- New ingest decisions arrive as messages with **Keep / Archive** inline buttons (handled by `telegram-webhook` callback router, same pattern as approvals).

## Out of scope
- No dashboards/analytics on knowledge growth (can come later).
- No automatic re-embedding when the embedding model changes.
- Audio file transcription is summarized via Lovable AI on the extracted text only — no Whisper integration yet.

## Files touched / new

New: migration, `supabase/functions/knowledge-ingest/index.ts`, `knowledge-research-cron/index.ts`, `knowledge-search/index.ts`, `knowledge-decision/index.ts`; storage bucket `knowledge-uploads`; topics section + ingest UI in `Documents.tsx`.
Edited: `jwba-room-save`, `optimus-chat`, `telegram-webhook` (new commands + new callback verbs), `RoomOverlay.tsx`/`Approvals.tsx` get small links to the new docs they spawn.

## Requirements
- Firecrawl connector must be linked (I'll prompt if not).
- `pg_cron` + `pg_net` extensions enabled for the daily research job.
- `pgvector` extension enabled.
