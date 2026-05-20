
# JWBA Workspace — Implementation Plan

A Roam/Logseq-style knowledge workspace layered on top of OPTIMUS, with daily notes, an outliner editor, agent blocks, bidirectional references, real-time sync, a graph view, and a Telegram bridge.

## 1. Database (new migration)

New tables (all RLS-scoped to `auth.uid()` via `created_by` / `tenant_id = auth.uid()`):

- `jwba_pages` — id, title (unique per tenant), is_daily, daily_date, tenant_id, created_at, updated_at
- `jwba_blocks` — id, page_id, parent_id (nullable, self-FK), sort_order (float for cheap reordering), content, block_type ('text'|'agent'|'decision'|'reference'|'file'), agent_codename, agent_output_id, telegram_message_id, created_by, created_at, updated_at
- `jwba_block_refs` — id, source_block_id, target_block_id (nullable), target_page_id (nullable), ref_type ('page'|'block'), created_at
- `jwba_agents` — codename (PK), display_name, color, spec jsonb, status ('idle'|'working'|'error'), telegram_command, sort_order
- `jwba_agent_outputs` — id, agent_codename, project_id (nullable), source_block_id, payload jsonb, status, created_at
- `jwba_agent_state` — project_id, telegram_chat_id, active_agent, context_page_id, updated_at

Seeded data on first user signup (extend `handle_new_user`):
- 11 agents with codenames/colors (Optimus, Atlas, Mercury, Apollo, Hermes, Iris, Vulcan, Nyx, Orion, Helios, Selene)
- A welcome page

Realtime: add `jwba_blocks`, `jwba_pages`, `jwba_agent_outputs` to `supabase_realtime` publication.

Indexes: `jwba_blocks(page_id, parent_id, sort_order)`, `jwba_block_refs(target_page_id)`, `jwba_block_refs(target_block_id)`, `jwba_pages(tenant_id, daily_date)`.

## 2. Routes

Mounted in `src/App.tsx` under a new `JwbaLayout` (separate three-pane shell, not the OPTIMUS sidebar):

- `/workspace` → redirect to `/workspace/daily/<today>`
- `/workspace/daily/:date` — daily note (auto-create on visit)
- `/workspace/page/:id` — any page
- `/workspace/graph` — force-directed graph

OPTIMUS sidebar gets a new "JWBA Workspace" entry pointing to `/workspace`.

## 3. Components

```
src/jwba/
  JwbaLayout.tsx           — top bar + three-pane shell, dark/light toggle
  TopBar.tsx               — logo, date, ⌘K search, Telegram status, user menu
  LeftSidebar.tsx          — Daily / Pages / Agents sections, collapsible
  RightSidebar.tsx         — Linked refs, Active agents, Open in Telegram
  PageView.tsx             — page title + outliner + linked refs
  Outliner.tsx             — recursive block tree
  Block.tsx                — single editable block (contentEditable), drag handle, agent chip
  SlashMenu.tsx            — "/" popover (agent, decision, reference, file)
  PageLinkAutocomplete.tsx — "[[" popover
  BlockRefAutocomplete.tsx — "((" popover
  AgentChip.tsx            — per-agent colored chip
  LinkedReferences.tsx     — backlinks list
  GraphView.tsx            — react-force-graph
  CommandPalette.tsx       — ⌘K
  hooks/
    usePage.ts, useBlocks.ts, useAgents.ts, useRealtimeBlocks.ts,
    useBlockTree.ts, useKeyboardOutliner.ts
  lib/
    blockOps.ts            — indent/outdent/move/insert/delete + sort_order math
    parseLinks.ts          — extract [[page]] and ((block)) refs, sync jwba_block_refs
    api.ts                 — typed supabase queries
```

## 4. Outliner mechanics

- Each block rendered as a `contentEditable` div (no heavy editor lib) with a left drag handle and a bullet.
- Keyboard: Enter = sibling below, Shift+Enter = newline in block, Tab = indent (set parent_id to previous sibling), Shift+Tab = outdent, Backspace on empty = delete + merge focus to previous, ArrowUp/Down = move caret across blocks.
- `sort_order` uses fractional indexing (midpoint between neighbors) to avoid mass renumbering.
- Drag-and-drop via `@dnd-kit/core` (already common). Drop targets: above / below / as-child.
- Debounced save (300ms) to `jwba_blocks.content`; on save, parse `[[…]]` and `((…))` and upsert `jwba_block_refs`.
- "/" opens `SlashMenu` at caret; "[[" / "((" open autocomplete popovers fed by live page/block search.

## 5. Agent blocks

- A block with `block_type='agent'` shows an `AgentChip` (color from `jwba_agents.color`) before content.
- "Ask <agent>" action on a block calls edge function `jwba-route-to-agent` with `{ block_id, agent_codename, content, context_page_id }`. Function inserts a new child block (type=agent, pending) and triggers Telegram via existing `telegram-send-message`.
- New edge function `jwba-agent-output-webhook` (or reuse Supabase trigger): when `jwba_agent_outputs` inserts, also insert a child block linked via `agent_output_id` under the requesting block. Implemented as a Postgres trigger calling a SECURITY DEFINER function (no extra HTTP roundtrip).

## 6. Realtime + animations

- One channel per page: `supabase.channel("jwba-page-${pageId}")` subscribed to `jwba_blocks` filtered by `page_id`.
- New blocks animate in with a 200ms slide+fade (Tailwind `animate-slide-up`, already defined).
- Agent status dots in left sidebar driven by a global channel on `jwba_agents` status updates.

## 7. Graph view (`/workspace/graph`)

- `react-force-graph-2d`. Nodes: all pages (large) + agent blocks (small). Edges: `jwba_block_refs`.
- Color by `agent_codename` (fallback to page tag/none). Click node → navigate to its page.
- Loads via a single Supabase query joining pages + agent blocks + refs.

## 8. Daily notes

- `/workspace` auto-resolves today's date in user's timezone and redirects.
- `getOrCreateDailyPage(date)` helper: select by `(tenant_id, daily_date)`; if missing, insert with `is_daily=true, title=<formatted date>`.

## 9. Styling

- Tailwind only, semantic tokens via existing `index.css`. Add a `--jwba-paper` light surface and a `[data-theme="light"]` override scoped to `JwbaLayout` so JWBA can run light while OPTIMUS shell stays dark.
- Outliner blocks: 14px / line-height 1.7, JetBrains Mono for inline code spans, Inter for prose.
- Agent chip palette declared in `src/jwba/lib/agentColors.ts` (HSL tokens, not raw hex in JSX).

## 10. Telegram bridge

- Top-bar status: green if `telegram_connections.is_active` for current user, amber otherwise.
- Right sidebar "Open in Telegram" → `https://t.me/jwba_team_bot` (configurable via env / agents.spec).
- Existing `telegram-webhook` extended to: if `jwba_agent_state.telegram_chat_id` matches, route incoming messages to `jwba_agent_outputs` for the `active_agent`.

## 11. Packages

`bun add react-force-graph-2d @dnd-kit/core @dnd-kit/sortable date-fns`

## 12. Out of scope (this pass)

- Full-text search across blocks (use ILIKE in ⌘K for now)
- Block embeds rendering nested live block trees (show preview text only)
- Multi-tenant beyond per-user (`tenant_id = auth.uid()`)
- File uploads from "/" slash menu (placeholder UI only)
- Mobile-optimized outliner gestures

## 13. Build order

1. Migration + seed agents in `handle_new_user`
2. `JwbaLayout` shell + routing + nav entry
3. Daily redirect + `PageView` skeleton
4. `Outliner` + `Block` with keyboard + persistence
5. Slash menu, `[[`, `((` autocompletes + ref sync
6. Realtime + linked references
7. Agent chips + `jwba-route-to-agent` edge function + output trigger
8. ⌘K palette + Telegram status
9. `/workspace/graph`

## Technical notes

- contentEditable kept dumb (plain text + marker parsing) to avoid an editor lib. Markdown bold/italic deferred.
- `sort_order` as `double precision`; new block between A(1.0) and B(2.0) gets 1.5. Renormalize when delta < 1e-6.
- All ref parsing happens client-side on save; server has no parser. Acceptable because RLS already scopes writes.
- Existing OPTIMUS data is untouched; tables prefixed `jwba_` to coexist.
