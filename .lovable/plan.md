# Agent Team Map + Drop-in Meeting Rooms

Add two live-collaboration features to JWBA Workspace: a real-time spatial map of all agents (and the user) plus lightweight "rooms" where the user can drop in, talk to one or more agents at once, and have the transcript stream back into a block.

## 1. Agent Team Map (`/workspace/map`)

A canvas (top-right pane or full page) showing every agent as a circular avatar floating in 2D space, with the user node in the center.

- **Visuals**: agent color halo, codename label, status ring (idle = dim, working = pulsing amber, in-room = solid cyan, error = red).
- **Activity hints**: small "thinking" dots when an agent is mid-output; recent activity (last block they wrote) shown on hover as a tooltip.
- **Connections**: animated cyan line between any two nodes currently in the same room. Faint dashed line from an agent to the block/page they last touched.
- **Realtime source**: subscribe to `jwba_agents` (status), `jwba_agent_outputs` (working pulses), and a new `jwba_rooms` / `jwba_room_members` table (presence).
- **Layout**: deterministic force layout seeded from `jwba_agents.sort_order`; user can drag agents to pin a position (saved per user).
- Entry points: new sidebar item "Team Map" and a mini-map widget in `RightSidebar`.

## 2. Drop-in Meeting Rooms

Lightweight ephemeral rooms — no scheduling, no video. Think Discord huddle for agents.

- **Start a room**: click an agent on the map (or "Start room" button in topbar) → opens an overlay panel with that agent already inside.
- **Invite more agents**: `+` button shows agent picker; selected agents join instantly and their map nodes link to the room.
- **Conversation**: chat-style transcript, user types prompts, each agent in the room responds in turn (round-robin) via Lovable AI (`google/gemini-3-flash-preview`). Each agent's system prompt comes from `jwba_agents.spec`.
- **Persistence**: every message saved to `jwba_room_messages`. On "End & save", the entire transcript becomes a new block on the current page (or today's daily) with `block_type='meeting'` and child blocks per turn. Agents tagged via `agent_codename` so they appear in linked refs.
- **Live presence**: who is "speaking" right now is broadcast through Supabase Realtime so the map and the room header animate in sync.
- **Quick actions inside a room**:
  - "Ask all" — broadcasts the prompt to every agent in parallel instead of round-robin.
  - "Hand off to <agent>" — pins the next response to a specific agent.
  - "Drop in another user" deferred (single-user only this pass).

## 3. Data model (new migration)

- `jwba_rooms` — id, user_id (owner), title, status ('open'|'closed'), source_block_id (nullable), saved_block_id (nullable), created_at, closed_at
- `jwba_room_members` — room_id, agent_codename (nullable for the human), joined_at, left_at, role ('host'|'agent')
- `jwba_room_messages` — id, room_id, sender_kind ('user'|'agent'), agent_codename, content, created_at
- `jwba_agent_positions` — user_id, agent_codename, x, y, pinned (for the map)
- Extend `jwba_agents.status` with new value `'in-room'` (text column, no enum change needed).
- RLS: all four tables scoped to `auth.uid()` via `user_id`; `jwba_room_members`/`jwba_room_messages` policies join through `jwba_rooms.user_id`.
- Add tables to `supabase_realtime` publication.

## 4. Edge functions

- `jwba-room-turn` — input `{ room_id, prompt, mode: 'round-robin' | 'broadcast' | 'handoff', target_agent? }`. Loads room + members + recent messages, calls Lovable AI per responding agent (system prompt from `jwba_agents.spec.system`), inserts assistant messages into `jwba_room_messages`, updates `jwba_agents.status` to `'in-room'` while running, returns once all replies are saved (or streams via SSE for round-robin).
- `jwba-room-save` — input `{ room_id, target_page_id }`. Collapses transcript into a parent block + child blocks, sets `jwba_rooms.saved_block_id`, status='closed', frees agents.

Both check `auth.uid() = jwba_rooms.user_id` server-side.

## 5. Frontend additions

```
src/jwba/
  map/
    TeamMap.tsx          — canvas, force layout, drag-to-pin
    AgentNode.tsx        — avatar + status ring + tooltip
    MapMini.tsx          — sidebar widget (read-only)
    useMapPresence.ts    — realtime subscription
  rooms/
    RoomOverlay.tsx      — slide-in panel
    RoomHeader.tsx       — member chips, "Ask all" / "Handoff" / "End & save"
    RoomTranscript.tsx   — message list with agent chips
    RoomComposer.tsx     — textarea + send
    AgentPicker.tsx      — search + add
    useRoom.ts           — fetch + realtime
  pages/
    MapPage.tsx          — `/workspace/map`
```

- New routes mounted in `src/App.tsx`: `/workspace/map`.
- New sidebar entry in `LeftSidebar.tsx`: "Team Map".
- `TopBar.tsx` gets a "Start room" button.
- Map uses plain SVG + a small `d3-force` import (lightweight) rather than another canvas lib; no new heavy deps beyond `d3-force`.

## 6. Realtime channels

- `jwba-map` (global per user): listens to `jwba_agents`, `jwba_agent_positions`, `jwba_rooms`, `jwba_room_members`.
- `jwba-room-<id>`: listens to `jwba_room_messages` and `jwba_room_members` for the open room.

## 7. UX rules

- Single open room at a time (closing a new one auto-saves or discards).
- Round-robin default; max 5 agents per room to keep responses snappy.
- Each agent's reply capped at ~400 tokens to keep cost predictable.
- All map nodes are keyboard-navigable (Tab cycles, Enter opens room with that agent).

## 8. Build order

1. Migration: rooms, members, messages, positions, realtime publication.
2. `jwba-room-turn` + `jwba-room-save` edge functions (round-robin first).
3. `TeamMap` page with static layout + realtime status colors.
4. `RoomOverlay` with text-only round-robin chat.
5. Agent picker, broadcast & handoff modes.
6. Drag-to-pin positions + `MapMini` in right sidebar.
7. "End & save" → block on current page.

## 9. Out of scope (this pass)

- Voice/audio rooms.
- Multi-human collaboration (presence of other logged-in users).
- Persistent rooms across sessions (only open/closed lifecycle).
- Streaming token-by-token in rooms (replies arrive whole; can be added later with SSE).
- Mobile layout for the map.

## Technical notes

- `d3-force` is ~30KB; runs entirely client-side, no SSR concerns.
- `jwba_agents.status` is shared global — for now we set it from `jwba-room-turn` while a turn runs and clear it on completion. Multi-user contention is acceptable since each tenant has their own logical agents (status is per-row, not per-user; revisit if multi-tenant becomes real).
- Cost guardrail: `jwba-room-turn` rejects if more than 5 active members.
- Existing `jwba_agent_output_to_block` trigger is untouched; rooms write their own messages and only insert blocks on explicit save.
