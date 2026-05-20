
-- ============ TABLES ============
CREATE TABLE public.jwba_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  is_daily boolean NOT NULL DEFAULT false,
  daily_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, title)
);
CREATE UNIQUE INDEX jwba_pages_tenant_daily_idx ON public.jwba_pages(tenant_id, daily_date) WHERE is_daily = true;

CREATE TABLE public.jwba_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.jwba_pages(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.jwba_blocks(id) ON DELETE CASCADE,
  sort_order double precision NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  block_type text NOT NULL DEFAULT 'text',
  agent_codename text,
  agent_output_id uuid,
  telegram_message_id text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jwba_blocks_page_idx ON public.jwba_blocks(page_id, parent_id, sort_order);

CREATE TABLE public.jwba_block_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_block_id uuid NOT NULL REFERENCES public.jwba_blocks(id) ON DELETE CASCADE,
  target_block_id uuid REFERENCES public.jwba_blocks(id) ON DELETE CASCADE,
  target_page_id uuid REFERENCES public.jwba_pages(id) ON DELETE CASCADE,
  ref_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jwba_block_refs_target_page_idx ON public.jwba_block_refs(target_page_id);
CREATE INDEX jwba_block_refs_target_block_idx ON public.jwba_block_refs(target_block_id);

CREATE TABLE public.jwba_agents (
  codename text PRIMARY KEY,
  display_name text NOT NULL,
  color text NOT NULL DEFAULT 'slate',
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'idle',
  telegram_command text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.jwba_agent_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_codename text NOT NULL REFERENCES public.jwba_agents(codename),
  project_id uuid,
  source_block_id uuid REFERENCES public.jwba_blocks(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.jwba_agent_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  telegram_chat_id bigint,
  active_agent text,
  context_page_id uuid REFERENCES public.jwba_pages(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ RLS ============
ALTER TABLE public.jwba_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jwba_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jwba_block_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jwba_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jwba_agent_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jwba_agent_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pages" ON public.jwba_pages FOR ALL USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "own blocks" ON public.jwba_blocks FOR ALL
  USING (EXISTS(SELECT 1 FROM public.jwba_pages p WHERE p.id = jwba_blocks.page_id AND p.tenant_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.jwba_pages p WHERE p.id = jwba_blocks.page_id AND p.tenant_id = auth.uid()));
CREATE POLICY "own block refs" ON public.jwba_block_refs FOR ALL
  USING (EXISTS(SELECT 1 FROM public.jwba_blocks b JOIN public.jwba_pages p ON p.id = b.page_id WHERE b.id = jwba_block_refs.source_block_id AND p.tenant_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.jwba_blocks b JOIN public.jwba_pages p ON p.id = b.page_id WHERE b.id = jwba_block_refs.source_block_id AND p.tenant_id = auth.uid()));
CREATE POLICY "agents readable" ON public.jwba_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "own agent outputs" ON public.jwba_agent_outputs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own agent state" ON public.jwba_agent_state FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ TRIGGERS ============
CREATE TRIGGER jwba_pages_set_updated BEFORE UPDATE ON public.jwba_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER jwba_blocks_set_updated BEFORE UPDATE ON public.jwba_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER jwba_agents_set_updated BEFORE UPDATE ON public.jwba_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create child block for agent outputs
CREATE OR REPLACE FUNCTION public.jwba_agent_output_to_block()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parent public.jwba_blocks%ROWTYPE;
  max_sort double precision;
BEGIN
  IF NEW.source_block_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO parent FROM public.jwba_blocks WHERE id = NEW.source_block_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT COALESCE(MAX(sort_order), 0) INTO max_sort FROM public.jwba_blocks
    WHERE page_id = parent.page_id AND parent_id = parent.id;
  INSERT INTO public.jwba_blocks(page_id, parent_id, sort_order, content, block_type, agent_codename, agent_output_id, created_by)
  VALUES (parent.page_id, parent.id, max_sort + 1, COALESCE(NEW.payload->>'text', ''), 'agent', NEW.agent_codename, NEW.id, NEW.user_id);
  RETURN NEW;
END $$;
CREATE TRIGGER jwba_agent_outputs_to_block AFTER INSERT ON public.jwba_agent_outputs
  FOR EACH ROW EXECUTE FUNCTION public.jwba_agent_output_to_block();

-- ============ REALTIME ============
ALTER TABLE public.jwba_blocks REPLICA IDENTITY FULL;
ALTER TABLE public.jwba_pages REPLICA IDENTITY FULL;
ALTER TABLE public.jwba_agent_outputs REPLICA IDENTITY FULL;
ALTER TABLE public.jwba_agents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jwba_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jwba_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jwba_agent_outputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jwba_agents;

-- ============ SEED AGENTS (global, one-time) ============
INSERT INTO public.jwba_agents (codename, display_name, color, telegram_command, sort_order) VALUES
  ('optimus','Optimus','sky','/optimus',1),
  ('atlas','Atlas','indigo','/atlas',2),
  ('mercury','Mercury','emerald','/mercury',3),
  ('apollo','Apollo','amber','/apollo',4),
  ('hermes','Hermes','violet','/hermes',5),
  ('iris','Iris','rose','/iris',6),
  ('vulcan','Vulcan','orange','/vulcan',7),
  ('nyx','Nyx','slate','/nyx',8),
  ('orion','Orion','cyan','/orion',9),
  ('helios','Helios','yellow','/helios',10),
  ('selene','Selene','fuchsia','/selene',11)
ON CONFLICT (codename) DO NOTHING;

-- ============ EXTEND handle_new_user TO SEED WELCOME PAGE ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  welcome_page_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, display_name, full_name, job_title, company)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), COALESCE(NEW.raw_user_meta_data->>'full_name', 'Executive User'), 'Chief Executive Officer', 'OPTIMUS Corp');

  INSERT INTO public.projects (user_id, title, description, status, priority) VALUES
    (NEW.id, 'Project Aurora', 'Q2 product launch campaign and go-to-market strategy', 'active', 'high'),
    (NEW.id, 'Operation Quantum', 'Infrastructure modernization and cloud migration', 'active', 'critical'),
    (NEW.id, 'Initiative Nexus', 'Strategic partnership and channel development', 'active', 'medium');

  INSERT INTO public.tasks (user_id, title, description, status, priority, due_date) VALUES
    (NEW.id, 'Review Q1 financial report', 'Comprehensive analysis of Q1 revenue and expenses', 'todo', 'high', CURRENT_DATE),
    (NEW.id, 'Approve marketing campaign', 'Sign off on Project Aurora campaign creative', 'todo', 'high', CURRENT_DATE);

  -- JWBA welcome page
  INSERT INTO public.jwba_pages (tenant_id, title, is_daily) VALUES (NEW.id, 'Welcome to JWBA Workspace', false)
  RETURNING id INTO welcome_page_id;
  INSERT INTO public.jwba_blocks (page_id, sort_order, content, created_by) VALUES
    (welcome_page_id, 1, 'Welcome — this is your shared brain.', NEW.id),
    (welcome_page_id, 2, 'Type [[ to link a page, (( to reference a block, / for commands.', NEW.id),
    (welcome_page_id, 3, 'Use Tab/Shift+Tab to indent. Press Enter for a new block.', NEW.id);

  RETURN NEW;
END;
$function$;
