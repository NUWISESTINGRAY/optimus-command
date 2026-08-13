# OPTIMUS Executive AI OS — System Write-Up

## 1. What the system is
A private executive AI operating system: a 17-agent team that receives work (from the web app or Telegram),
classifies it, executes it with AI, saves the output to the Knowledge Vault, and asks for approval
before anything sensitive happens.

## 2. Surfaces
### Main app (protected routes)
- `/` Command Center (dashboard KPIs, recent runs)
- `/chat` Talk to OPTIMUS / any agent (text + voice dictation + TTS playback)
- `/tasks` Mission Queue (kanban; tasks auto-dispatch to agents)
- `/workflows` ATLAS Flow Engine (multi-step workflows)
- `/automations`, `/automations/:id`, `/automations/:id/runs` Node-graph automation builder,
  run trace viewer with per-node input/output diff and jump-to-node config
- `/memory` Rolling agent memory
- `/documents` Knowledge Vault (semantic search, document detail modal)
- `/email` Email queue
- `/approvals` Approval Gate (realtime; syncs with Telegram)
- `/logs`, `/settings`
### JWBA Workspace (`/workspace/...`)
Daily pages, page graph, linked references, live team map, agent directory, instant drop-in rooms.

## 3. The agent team (17)
optimus, athena, cipher, nova, atlas, victoria, sentinel, aaron, mark, cody, patty, vicky, jerry,
dolly, maya, angelina, frannie — each with a persona portrait, an ElevenLabs voice, and a role spec.

Execution modes used by auto-dispatch: COO, CMO, CFO, CTO, CRO, HR, Research,
Executive Assistant, Chief of Staff.

## 4. Workflows

### 4.1 ATLAS workflows (`atlas_workflows` + steps, run by `atlas-run-workflow`)
| Workflow | Trigger | Status |
|---|---|---|
| Daily Executive Brief | scheduled | active |
| Telegram Idea Pipeline | telegram_message | active |
| Message Triage Pipeline | telegram_message | active |
| Research & Approval Flow | manual | active |

**Daily Executive Brief steps:** Start (trigger) → Generate Executive Brief (AI) →
Save Brief as Document → Send Brief to Telegram → Notify in App.
**Telegram Idea Pipeline steps:** Idea Received → Structure the Idea (Chief of Staff) →
Save Idea Brief → Create Follow-Up Task → Confirm on Telegram → Notify in App.

**Message Triage Pipeline steps:** Inbound Message → Triage & Draft Reply (Executive Assistant) →
Save Draft Reply → **Approval Gate** → Send Reply Confirmation → Notify in App.

**Research & Approval Flow steps:** Research Requested → Run Deep Research (Research) →
Save Research Report → **Approval Gate** → Create Action Task → Notify in App.

### 4.2 Task auto-dispatch (always-on)
DB trigger on new task → `task-auto-dispatch` → keyword classifier picks the role
(finance→CFO, marketing→CMO, engineering→CTO, sales→CRO, people→HR, research→Research,
admin→EA, cross-functional→Chief of Staff, default→COO) → AI produces the deliverable →
result stored on the task, logged in `agent_runs`, and saved as a Document.

### 4.3 Knowledge Vault growth loop
`knowledge-ingest` (Firecrawl crawl + GPT-5 synthesis + embeddings) →
`knowledge-research-cron` (scheduled expansion of watched topics) →
`knowledge-search` (server-side vector search via `match_document_chunks`) →
`knowledge-decision` (accept/reject into the vault).

### 4.4 Approval Gate
Any risky action creates an `approvals` row → Telegram message with Approve/Reject buttons →
tap routes to `agent-action-execute` (or resumes the paused ATLAS run) → web UI updates
instantly over realtime. Already-decided approvals return `skipped` instead of a 409.

### 4.5 Node automations
`automation-webhook` / `automation-scheduler` / manual → `automation-run` executes the node graph,
writing `automation_runs` and `automation_node_runs` for the trace viewer.
Two automation graphs exist and are currently empty/inactive.

### 4.6 Email
`enqueue_email` → pgmq queue → `process-email-queue` (JWT-verified) sends via
notify.jwbrandagency.com, with DLQ handling.

## 5. Telegram bot (@JWOptimusbot)
Webhook registered with `allowed_updates: ["message","callback_query"]`, 0 pending, no errors.
Commands: /start /help /brief /summarize /tasks /workflow /approvals /agents /agent /panel
/roundtable /debate /voice_test /vault /watch /watchlist /unwatch /save /endroom /reset.
Features: rolling memory, agent switching, multi-agent roundtables and debates,
voice notes per persona, room bridge that mirrors chats into daily workspace pages.

## 6. Backend functions (19)
agent-action-execute, atlas-run-workflow, automation-run, automation-scheduler, automation-webhook,
jwba-room-save, jwba-room-turn, knowledge-decision, knowledge-ingest, knowledge-research-cron,
knowledge-search, mcp, optimus-chat, optimus-tts, process-email-queue, task-auto-dispatch,
telegram-send-message, telegram-set-webhook, telegram-webhook.
All fail fast with a clear message when required env keys are missing.

## 7. Agent integrations (MCP)
The app is itself an MCP server (`mcp` function + OAuth consent screen) exposing
`list_tasks`, `create_task`, `list_agents`, `list_pending_approvals`, authenticated per user so RLS applies.

## 8. Security posture
- RLS on all user tables, ownership scoped to `auth.uid()`.
- SECURITY DEFINER functions are not callable by `anon`; only the two RLS predicate helpers
  (`has_role`, `user_owns_automation`) remain executable by signed-in users because
  row-level security evaluation requires it. `match_document_chunks` is server-side only.
- Storage policies scoped per user; leaked-password protection enabled.
