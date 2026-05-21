# JW Brand AI Team — Roster Install

Replace the placeholder agent roster (optimus, atlas, mercury, apollo…) with the 17 JW Brand agents Josh defined, wire their full system prompts, slash commands, and brand colors, and surface them everywhere the workspace already shows agents.

## 1. Seed the 17 agents (migration)

New migration that:

- Deletes existing rows in `jwba_agents` (current placeholders are demo).
- Inserts the 17 agents with `codename`, `display_name`, `sort_order`, `status='idle'`, and a rich `spec` JSONB:
  - `role` — e.g. "COO / Chief of Staff"
  - `tagline` — one-line description
  - `slash` — e.g. `/ask-optimus`
  - `expertise` — array
  - `responsibilities` — array
  - `collaborates_with` — array of codenames
  - `success_metrics` — array
  - `system` — the full persona + intro + gathering + delivery instructions, formatted as a single system prompt. This is what `jwba-room-turn` already reads from `spec.system`, so rooms immediately speak in-character.
- Adds a confidentiality footer to every `system` prompt (the "CONFIDENTIALITY AND PROFESSIONALISM" block applied to all agents).

Sort order groups: executives first (optimus, athena, cipher, nova, atlas, victoria, sentinel), then specialists (aaron, mark, cody, patty, vicky, jerry, dolly, maya, angelina, frannie).

## 2. Agent color palette

Extend `src/jwba/lib/agentColors.ts` with all 17 codenames in both `AGENT_COLORS` (Tailwind chip classes) and `AGENT_HSL` (map node halos). Assignments map role family to hue family:

```text
Executives (cool, authoritative)
  optimus  cyan     athena  emerald   cipher   indigo
  nova     fuchsia  atlas   sky       victoria slate
  sentinel rose

Specialists (warm, creative)
  aaron amber    mark   orange   cody  violet
  patty pink     vicky  lime     jerry red
  dolly  fuchsia maya   teal     angelina blue
  frannie yellow
```

Keep the existing `agentColor` / `agentHsl` fallback to `nyx`.

## 3. Slash commands in the composer

In `src/jwba/Block.tsx` (block editor) add a `/ask-<codename>` autocomplete: typing `/ask-` shows the 17 agents (filter by codename or display name), Enter inserts a block that requests that agent. Implementation: when the user picks one, insert a new child block with `block_type='agent-request'`, `agent_codename=<code>`, and content = the rest of the line. Then a tiny edge function (`jwba-agent-ask`) reads the request, calls Lovable AI with `spec.system`, and writes the reply via the existing `jwba_agent_outputs` → `jwba_agent_output_to_block` trigger so it lands as a child block. (No DB schema change — `jwba_agent_outputs` and the trigger already exist.)

## 4. Agent directory page

New route `/workspace/agents` (`src/jwba/pages/AgentsPage.tsx`):

- Two sections: Executive Leadership / Specialists.
- Card per agent: color halo, codename, display name, role, tagline, slash command, status dot, "Start room" button (calls existing `RoomProvider.openRoom(codename)`), "View profile" opens a Sheet with full `spec` (expertise, responsibilities, collaborators as chips linking to other agents, success metrics).

Add a sidebar entry "Agents" in `LeftSidebar.tsx` next to Team Map / Knowledge Graph, and update the existing collapsed agent list to use the new roster (already automatic once the table is reseeded).

## 5. Team map labels

`src/jwba/map/TeamMap.tsx` already renders whatever rows are in `jwba_agents`, so re-seeding does the work. Two small additions:

- Cluster seed positions: executives ring at radius 140, specialists ring at radius 240, based on `sort_order`.
- Tooltip shows `spec.role` and `spec.tagline` instead of just codename.

## 6. Room overlay polish

`RoomOverlay.tsx` agent picker should group by Executive / Specialist using the new roster and show slash command + role under each name. No behavioral change to room turn logic — `jwba-room-turn` already uses `spec.system`.

## 7. Out of scope

- Voice, image generation by agents, multi-tenant agents, scheduling.
- Reworking the existing `optimus-chat` edge function (separate Optimus persona for the chat page can be migrated later).
- Per-agent custom tools / RAG over the workspace (future pass).

## 8. Build order

1. Migration: wipe + seed 17 agents with full spec.
2. Extend `agentColors.ts`.
3. `AgentsPage.tsx` + sidebar entry + route in `App.tsx`.
4. Slash autocomplete in `Block.tsx` + `jwba-agent-ask` edge function.
5. Map seed positions + richer tooltip.
6. Room picker grouping.

## Technical notes

- `jwba_agents.spec` is JSONB and already read by `jwba-room-turn` (`spec.system`) — no schema migration needed beyond the seed.
- The slash autocomplete reuses the existing `[[ ]]` / `(( ))` popover pattern in `Block.tsx`.
- All system prompts will be stored verbatim from Josh's spec, with the universal conversational rule + confidentiality footer appended once per agent so future edits to those globals can be re-applied by re-running the seed.
- Re-running the seed is idempotent: `INSERT ... ON CONFLICT (codename) DO UPDATE SET display_name = EXCLUDED.display_name, spec = EXCLUDED.spec, sort_order = EXCLUDED.sort_order`.
