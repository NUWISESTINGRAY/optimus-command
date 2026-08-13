REVOKE EXECUTE ON FUNCTION public.match_document_chunks(vector, integer, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_owns_automation(uuid) FROM anon, authenticated;