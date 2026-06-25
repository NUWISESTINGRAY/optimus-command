-- Optimus content agent: task/approval tracking table
-- Every request, draft, approval, and post outcome lives here.

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  chat_id bigint not null,
  telegram_message_id bigint,
  platform text not null default 'linkedin',
  request_text text not null,
  draft_content text not null,
  status text not null default 'drafted'
    check (status in (
      'drafted',
      'pending_approval',
      'revision_requested',
      'approved',
      'rejected',
      'posted',
      'failed'
    )),
  ayrshare_post_id text,
  error text
);

create index if not exists agent_tasks_status_idx on public.agent_tasks (status);
create index if not exists agent_tasks_chat_id_idx on public.agent_tasks (chat_id);

alter table public.agent_tasks enable row level security;

-- Intentionally no public policies: this table is only ever touched by
-- Edge Functions using the service_role key, which bypasses RLS.
-- Anon/authenticated client access is fully blocked by default.
