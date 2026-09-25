CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'client' CHECK (kind IN ('internal','client','venture','program')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entities" ON public.entities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_entities_updated BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.frameworks DROP CONSTRAINT IF EXISTS frameworks_kind_check;
ALTER TABLE public.frameworks ADD CONSTRAINT frameworks_kind_check CHECK (kind IN ('framework','sop','manual','spec'));
ALTER TABLE public.frameworks
  ADD COLUMN code text,
  ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','definition_pending','draft','retired')),
  ADD COLUMN layer text,
  ADD COLUMN owner_role text,
  ADD COLUMN source_ref text,
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL;

ALTER TABLE public.task_import_batches
  ADD COLUMN kickoff_date date,
  ADD COLUMN package_version text,
  ADD COLUMN instruction text;

ALTER TABLE public.task_import_items DROP CONSTRAINT IF EXISTS task_import_items_status_check;
ALTER TABLE public.task_import_items ADD CONSTRAINT task_import_items_status_check CHECK (status IN
  ('proposed','approved','ready','in_progress','blocked','qa','awaiting_approval','done','cancelled','rejected','promoted'));
ALTER TABLE public.task_import_items
  ADD COLUMN external_id text,
  ADD COLUMN phase_days text,
  ADD COLUMN owner_role text,
  ADD COLUMN due_offset_days integer,
  ADD COLUMN dependencies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN deliverable text,
  ADD COLUMN acceptance_criteria text,
  ADD COLUMN approval_role text,
  ADD COLUMN automation_mode text,
  ADD COLUMN entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  ADD COLUMN assignee_name text,
  ADD COLUMN assignee_agent text,
  ADD COLUMN actual_due_date date,
  ADD COLUMN evidence_links text[] NOT NULL DEFAULT '{}',
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN approval_id uuid REFERENCES public.approvals(id) ON DELETE SET NULL,
  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX task_import_items_batch_ext ON public.task_import_items(batch_id, external_id) WHERE external_id IS NOT NULL;

CREATE TABLE public.jw_role_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  role_name text NOT NULL,
  role_kind text NOT NULL DEFAULT 'human_role' CHECK (role_kind IN ('human_role','agent_spec')),
  mission text,
  inputs text,
  output text,
  boundary text,
  human_owner text,
  mapped_codename text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jw_role_mappings TO authenticated;
GRANT ALL ON public.jw_role_mappings TO service_role;
ALTER TABLE public.jw_role_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own role mappings" ON public.jw_role_mappings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_role_map_updated BEFORE UPDATE ON public.jw_role_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_framework_task_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.source_type = 'framework_task' AND NEW.source_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.task_import_items SET status = 'approved'
        WHERE id = NEW.source_id AND user_id = NEW.user_id AND status IN ('proposed','awaiting_approval');
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.task_import_items SET status = 'proposed'
        WHERE id = NEW.source_id AND user_id = NEW.user_id AND status = 'awaiting_approval';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.sync_framework_task_approval() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_sync_framework_task_approval AFTER UPDATE OF status ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.sync_framework_task_approval();