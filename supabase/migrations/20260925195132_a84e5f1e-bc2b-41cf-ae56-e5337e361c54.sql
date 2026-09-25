CREATE TABLE public.frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'framework' CHECK (kind IN ('framework','sop')),
  slug text NOT NULL,
  name text NOT NULL,
  category text,
  description text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.frameworks TO authenticated;
GRANT ALL ON public.frameworks TO service_role;
ALTER TABLE public.frameworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own frameworks" ON public.frameworks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_frameworks_updated BEFORE UPDATE ON public.frameworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.framework_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  version integer NOT NULL,
  content text NOT NULL DEFAULT '',
  change_notes text,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (framework_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.framework_versions TO authenticated;
GRANT ALL ON public.framework_versions TO service_role;
ALTER TABLE public.framework_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own framework versions" ON public.framework_versions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.framework_version_set_current()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE public.framework_versions SET is_current = false
      WHERE framework_id = NEW.framework_id AND id <> NEW.id AND is_current;
    UPDATE public.frameworks SET updated_at = now() WHERE id = NEW.framework_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_framework_version_current AFTER INSERT OR UPDATE OF is_current ON public.framework_versions
  FOR EACH ROW EXECUTE FUNCTION public.framework_version_set_current();

CREATE TABLE public.pulse_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  subject text NOT NULL DEFAULT 'JW Brand',
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_assessments TO authenticated;
GRANT ALL ON public.pulse_assessments TO service_role;
ALTER TABLE public.pulse_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pulse" ON public.pulse_assessments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.prompts_maturity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  dimension text NOT NULL,
  level integer NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 5),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dimension)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompts_maturity TO authenticated;
GRANT ALL ON public.prompts_maturity TO service_role;
ALTER TABLE public.prompts_maturity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prompts maturity" ON public.prompts_maturity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_prompts_updated BEFORE UPDATE ON public.prompts_maturity FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.task_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_import_batches TO authenticated;
GRANT ALL ON public.task_import_batches TO service_role;
ALTER TABLE public.task_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own import batches" ON public.task_import_batches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.task_import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.task_import_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  priority text,
  framework_ref text,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected','promoted')),
  promoted_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_import_items TO authenticated;
GRANT ALL ON public.task_import_items TO service_role;
ALTER TABLE public.task_import_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own import items" ON public.task_import_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_import_items_updated BEFORE UPDATE ON public.task_import_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();