
# Full "All-Hands" Agent Capabilities

Make every agent reachable everywhere, give them real meetings, let them debate, and let them act.

## 1. `/roundtable` on Telegram

A multi-agent fan-out from Telegram that mirrors the web Room "broadcast" mode.

- New commands:
  - `/roundtable <topic>` — sends the topic to a default executive panel (Optimus, Athena, Cipher, Nova, Atlas, Sentinel) and streams each reply back.
  - `/roundtable <codename,codename,...> | <topic>` — custom panel.
  - `/panel save` — list named panels; `/panel <name> <codenames>` — save a reusable panel for fast recall.
- Each agent's reply is sent as its own Telegram message, prefixed with `*<Agent Name>*`, so the chat reads like a meeting transcript.
- After all agents respond, Optimus posts a final **Synthesis** message summarizing the consensus, disagreements, and next actions.
- The entire roundtable is mirrored into today's `Telegram – YYYY-MM-DD` Room (one user message + one block per agent + the synthesis), so `/save` writes the meeting to the daily page.

## 2. "Meeting" preset in web Rooms

A one-click meeting in the existing Rooms overlay.

- Add a **Start meeting** button next to the existing "+ agent" picker.
- Opens a small dialog: choose panel (Executive, Marketing, Launch, Custom), enter agenda.
- On confirm: adds all chosen agents as members, switches the room mode to a new **meeting** mode, and posts a system block with the agenda template:
  1. Problem statement (user)
  2. Each agent's POV (round-robin)
  3. Cross-talk (debate — see §3)
  4. Optimus synthesis + recommended decisions
- "End & save" already saves the room as a meeting block on today's daily page — no change needed there.

## 3. Agent-to-agent debate

Agents respond to each other, not just to the user, until Optimus calls consensus.

- New room mode **debate** (selectable in the Room overlay alongside round-robin / broadcast / handoff).
- Turn engine (in `jwba-room-turn` edge function):
  - Round 1: each agent replies to the user prompt with their POV (same as round-robin).
  - Round 2+: each agent is shown the full transcript and asked to react to the other agents' positions — agree, push back, refine. Stop conditions: max 3 rounds, Optimus emits a `[CONSENSUS]` marker, or user types `/stop` / clicks **Stop**.
  - Final turn: Optimus posts a structured synthesis (decision, dissents, action items).
- Telegram parity: `/debate <topic>` runs the same loop on the configured executive panel and streams each round as separate messages.

## 4. Action execution (agents can actually do things)

Wire agent recommendations to ATLAS workflows and n8n so they can fire real-world actions, gated by the Approval Gate.

- **Action proposals**: agents can emit a structured action block in their reply:
  ```
  [ACTION:create_task]{ "title": "...", "due": "2026-05-25", "assignee": "Josh" }
  [ACTION:send_email]{ "to": "...", "subject": "...", "body": "..." }
  [ACTION:run_workflow]{ "workflow_id": "...", "input": {...} }
  [ACTION:n8n]{ "workflow_id": "...", "input": {...} }
  ```
- The edge function parses these markers and creates an **Approval** row (`approvals` table) with a one-tap accept/reject:
  - On web: rendered as a card inside the room message ("Athena proposed: send email — [Approve] [Reject]").
  - On Telegram: posted as an inline button message; tap Approve → executes; Reject → marks denied.
- Executor service (new edge function `agent-action-execute`) dispatches by action type:
  - `create_task` → insert into `tasks`.
  - `send_email` → Lovable Cloud email send (or n8n email workflow).
  - `schedule_meeting` → Google Calendar via existing connector.
  - `run_workflow` → calls `automation-run` or `atlas-run-workflow`.
  - `n8n` → calls the n8n MCP workflow via the gateway.
- Per-agent action allowlist stored on `jwba_agents.spec.allowed_actions` so Sentinel can review only, while Optimus/Mark can launch workflows.
- Every executed action writes an `agent_runs` row for the audit log.

## 5. Telegram inline buttons

Required for the Approve/Reject UX in §4. Switch outbound sends to support `reply_markup` with `inline_keyboard`, and add a `callback_query` branch in the webhook that resolves the approval id and triggers the executor.

## Technical notes

**Edge functions touched / new:**
- `telegram-webhook` — add `/roundtable`, `/debate`, `/panel`, `/stop`, and a `callback_query` handler for approval buttons.
- `jwba-room-turn` — new `meeting` and `debate` modes; emits Optimus synthesis on closeout; parses `[ACTION:...]` markers and creates approval rows.
- `agent-action-execute` (new) — dispatcher for proposed actions; called by the Approve button.
- `telegram-send-message` — extend to support inline keyboards and an optional `reply_markup`.

**DB changes (single migration):**
- `agent_panels` table: `id, user_id, name, codenames[], created_at`.
- `approvals` already exists — add `action_type text`, `action_payload jsonb`, `agent_codename text`, `room_id uuid` columns.
- Add `allowed_actions jsonb` to `jwba_agents.spec` (no schema change, it's already jsonb).

**Frontend changes:**
- `RoomOverlay.tsx` — add "Start meeting" dialog, new mode buttons (meeting / debate), `[ACTION]` block renderer with Approve/Reject.
- Approvals page — render action proposals with one-tap execute.

**No new connectors required** — uses existing Telegram, Google Calendar, and n8n integrations.

## Out of scope (for now)
- Voice/audio meetings.
- Real-time streaming of partial agent tokens to Telegram (each agent's reply lands as one full message).
- Cross-user shared rooms.
- Long-running multi-day debates with overnight pauses.
