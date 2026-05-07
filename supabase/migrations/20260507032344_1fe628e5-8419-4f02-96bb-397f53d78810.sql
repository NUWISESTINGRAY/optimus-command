
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.automation_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled automation',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  webhook_token TEXT UNIQUE,
  schedule_cron TEXT,
  telegram_filter TEXT,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aw_user ON public.automation_workflows(user_id);
CREATE INDEX idx_aw_trigger_active ON public.automation_workflows(trigger_type, active);
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.automation_workflows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.automation_workflows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.automation_workflows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.automation_workflows FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.user_owns_automation(_workflow_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.automation_workflows WHERE id = _workflow_id AND user_id = auth.uid())
$$;

CREATE TABLE public.automation_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  type TEXT NOT NULL,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, node_key)
);
CREATE INDEX idx_an_wf ON public.automation_nodes(workflow_id);
ALTER TABLE public.automation_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_nodes" ON public.automation_nodes FOR ALL
  USING (public.user_owns_automation(workflow_id))
  WITH CHECK (public.user_owns_automation(workflow_id));

CREATE TABLE public.automation_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  source_node_key TEXT NOT NULL,
  source_handle TEXT,
  target_node_key TEXT NOT NULL,
  target_handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ae_wf ON public.automation_edges(workflow_id);
ALTER TABLE public.automation_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_edges" ON public.automation_edges FOR ALL
  USING (public.user_owns_automation(workflow_id))
  WITH CHECK (public.user_owns_automation(workflow_id));

CREATE TABLE public.automation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_ar_wf ON public.automation_runs(workflow_id, started_at DESC);
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_runs" ON public.automation_runs FOR ALL
  USING (public.user_owns_automation(workflow_id))
  WITH CHECK (public.user_owns_automation(workflow_id));

CREATE TABLE public.automation_node_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.automation_runs(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_anr_run ON public.automation_node_runs(run_id);
ALTER TABLE public.automation_node_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_node_runs" ON public.automation_node_runs FOR ALL
  USING (public.user_owns_automation(workflow_id))
  WITH CHECK (public.user_owns_automation(workflow_id));

CREATE TRIGGER trg_aw_updated
BEFORE UPDATE ON public.automation_workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_node_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_runs;
