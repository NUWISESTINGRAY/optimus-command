ALTER TABLE public.pulse_assessments ADD COLUMN entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE, ADD COLUMN evidence_links text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.prompts_maturity ADD COLUMN entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE;
ALTER TABLE public.prompts_maturity DROP CONSTRAINT IF EXISTS prompts_maturity_user_id_dimension_key;
CREATE UNIQUE INDEX prompts_maturity_scope_uq ON public.prompts_maturity (user_id, dimension, entity_id) NULLS NOT DISTINCT;