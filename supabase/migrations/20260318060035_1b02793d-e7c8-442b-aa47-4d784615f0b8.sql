
-- =============================================
-- SCHEMA EXPANSION: ATLAS + Telegram + Agent
-- =============================================

-- 1. Expand profiles with missing columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS preferences_json JSONB DEFAULT '{}';

-- 2. Expand chat_sessions with status
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active','archived','deleted'));

-- 3. Expand chat_messages with structured fields
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachments_json JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS citations_json JSONB DEFAULT '[]';

-- 4. Expand agent_runs with session link, mode, confidence
ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_mode TEXT,
  ADD COLUMN IF NOT EXISTS input_json JSONB,
  ADD COLUMN IF NOT EXISTS output_json JSONB,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS task_type TEXT;

-- 5. ATLAS Workflows (separate from existing workflows table)
CREATE TABLE public.atlas_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual','telegram_message','scheduled','new_task','approval_decision')),
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own atlas workflows" ON public.atlas_workflows FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_atlas_workflows_updated_at BEFORE UPDATE ON public.atlas_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. ATLAS Workflow Steps
CREATE TABLE public.atlas_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.atlas_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL CHECK (step_type IN ('trigger','ai_action','condition','action','approval')),
  title TEXT NOT NULL DEFAULT 'New Step',
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atlas_workflow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own atlas steps" ON public.atlas_workflow_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM public.atlas_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.atlas_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid()));

-- 7. ATLAS Workflow Runs
CREATE TABLE public.atlas_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.atlas_workflows(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','paused','cancelled')),
  current_step_index INTEGER DEFAULT 0,
  input_json JSONB DEFAULT '{}',
  output_json JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.atlas_workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own atlas runs" ON public.atlas_workflow_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.atlas_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.atlas_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid()));

-- 8. Expand approvals for ATLAS linkage
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'workflow',
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS payload_json JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;

-- 9. Telegram connections
CREATE TABLE public.telegram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_name TEXT,
  chat_id BIGINT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own telegram connections" ON public.telegram_connections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. Telegram messages
CREATE TABLE public.telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_text TEXT,
  raw_payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own telegram messages" ON public.telegram_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. Expand notifications with channel and payload
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'app' CHECK (channel IN ('app','telegram','email')),
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread',
  ADD COLUMN IF NOT EXISTS payload_json JSONB DEFAULT '{}';

-- 12. Expand integrations with provider field
ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}';

-- 13. Index for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_session ON public.agent_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_atlas_steps_workflow ON public.atlas_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_atlas_runs_workflow ON public.atlas_workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat ON public.telegram_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_approvals_source ON public.approvals(source_type, source_id);
