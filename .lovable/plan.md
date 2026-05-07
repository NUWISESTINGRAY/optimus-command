## Goal

Turn the existing ATLAS Flow Engine into a true n8n-style automation builder: drag-and-drop node canvas, large library of integration nodes, multiple trigger types, and full server-side execution in Lovable Cloud.

## What gets built

### 1. Visual node canvas (React Flow)

Replace the current step-list editor on `/workflows` with a drag-and-drop canvas:

- **Library**: `@xyflow/react` (React Flow) — industry standard, what n8n itself is built on conceptually.
- **Canvas features**: pan, zoom, minimap, drag nodes, connect node outputs → inputs via edges, multi-select, delete with key, auto-layout button.
- **Node sidebar (left)**: searchable palette of all node types, drag onto canvas to add.
- **Inspector (right)**: opens when a node is selected; shows config form generated from the node type's schema (text, select, JSON, code, credential picker).
- **Top bar**: workflow name, Active/Inactive toggle, Save, Test Run, Open Run History.
- **Run overlay**: when a run executes (or replay from history), nodes light up green/red/yellow with output preview on hover.

### 2. Node library

Triggers (per your selection):
- Manual / Test
- Schedule (cron expression)
- Webhook (auto-generates a public URL `/functions/v1/wf-webhook/{token}`)
- Telegram message received (hooks existing telegram-webhook)
- Email received (placeholder hook for later email integration)
- DB event (insert/update on a chosen table via Postgres triggers → pg_net)

Actions / Logic:
- HTTP Request (GET/POST/etc, headers, body, auth)
- Set / Transform (map fields with JS expression)
- IF / Switch (branching with multiple outputs)
- Loop over items
- Wait / Delay
- Merge branches
- AI Action (Lovable AI Gateway, prompt template, model picker)
- Approval gate (existing approvals table)
- Send Telegram message
- Create Task / Document / Notification (existing tables)
- Run sub-workflow
- Call n8n workflow (uses MCP `execute_workflow` via the existing n8n integration)

Each node type is declared in `src/lib/nodes/registry.ts` with: `type`, `category`, `icon`, `inputs`, `outputs`, `configSchema` (Zod), `defaults`. The canvas + inspector are fully driven by this registry, so adding a node later = one file edit.

### 3. Database changes

New tables (migration):

- `automation_workflows` — `id`, `user_id`, `name`, `description`, `active`, `trigger_type`, `webhook_token` (unique, nullable), `schedule_cron` (nullable), `created_at`, `updated_at`.
- `automation_nodes` — `id`, `workflow_id`, `node_key` (stable id used in edges), `type`, `position_x`, `position_y`, `config_json`.
- `automation_edges` — `id`, `workflow_id`, `source_node_key`, `source_handle`, `target_node_key`, `target_handle`.
- `automation_runs` — `id`, `workflow_id`, `status` (running/completed/failed/paused), `trigger_source`, `input_json`, `output_json`, `error`, `started_at`, `completed_at`.
- `automation_node_runs` — `id`, `run_id`, `node_key`, `status`, `input_json`, `output_json`, `error`, `started_at`, `completed_at`.

All with RLS scoped to `user_id` (via `workflow_id` join for child tables). The existing `atlas_*` tables are left intact so current data is preserved; the new system lives under `/automations`.

### 4. Edge functions

- `automation-run` — executes a workflow graph: builds DAG from nodes/edges, walks it from trigger, runs each node based on its `type`, persists `automation_node_runs`, supports pause-on-approval (resumes via `automation-resume`).
- `automation-webhook` — public endpoint `automation-webhook/{token}`; looks up the workflow and invokes `automation-run` with the request body as trigger payload.
- `automation-scheduler` — invoked every minute by pg_cron; queries active workflows with `trigger_type='schedule'` whose cron matches now, fires `automation-run`.
- `automation-db-event` — generic endpoint called by Postgres triggers via `pg_net` for DB-event triggers.
- Telegram: extend existing `telegram-webhook` to also dispatch matching `trigger_type='telegram'` workflows.

### 5. Scheduling

- Enable `pg_cron` + `pg_net`.
- One pg_cron job calling `automation-scheduler` every minute (created via insert tool, not migration, since it embeds the project URL/anon key).

### 6. UI structure

- New route `/automations` — list of workflows with status, last run, run count.
- New route `/automations/:id` — the canvas builder.
- New route `/automations/:id/runs` — run history with per-node output inspector.
- Sidebar nav: add "Automations" item; keep old "Workflows" (ATLAS) for backward compatibility, or hide behind a feature flag if you prefer.

## Technical details

- **Engine**: Topological execution with per-node try/catch. Each node receives merged input from incoming edges; output is keyed by `node_key` so downstream nodes reference `{{nodes.previous.field}}` via simple string interpolation.
- **Expressions**: Lightweight `{{path.to.value}}` resolver (no eval). For Transform node, run user JS inside a sandboxed `new Function()` with only the input object exposed.
- **Webhook security**: random 32-char token in URL path; optional shared-secret header check configurable per workflow.
- **Realtime**: subscribe to `automation_node_runs` on the canvas during a run so nodes light up live.
- **Packages to add**: `@xyflow/react`, `cronstrue` (human-readable cron), `cron-parser` (next-run calc, used in edge function).

## Out of scope (call out now)

- Marketplace of pre-built community nodes.
- OAuth credential manager UI (HTTP node will accept raw header/bearer for v1; OAuth-per-service can come later).
- Versioning / workflow history diff.
- The existing ATLAS Flow Engine pages stay as-is; this is a parallel new system. Say the word if you want them removed once the new one is stable.

## Build order

1. Migration: new tables + RLS + indexes.
2. Node registry + types.
3. `/automations` list page + create/delete.
4. Canvas builder page with React Flow, palette, inspector, save.
5. `automation-run` edge function with core node executors.
6. Test Run button + live highlight via realtime.
7. Webhook + scheduler + Telegram trigger wiring.
8. Run history page.