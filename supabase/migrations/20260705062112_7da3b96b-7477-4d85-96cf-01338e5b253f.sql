
-- Lock down SECURITY DEFINER functions: revoke public execute, grant only where needed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Re-grant EXECUTE for functions that must be callable by signed-in users
-- (used inside RLS policies or as RPCs).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_automation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector, integer, uuid) TO authenticated;
