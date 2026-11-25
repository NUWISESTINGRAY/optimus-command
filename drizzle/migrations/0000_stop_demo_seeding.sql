CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE welcome_page_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, display_name, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.jwba_pages (tenant_id, title, is_daily) VALUES (NEW.id, 'Welcome to JWBA Workspace', false)
  RETURNING id INTO welcome_page_id;
  INSERT INTO public.jwba_blocks (page_id, sort_order, content, created_by) VALUES
    (welcome_page_id, 1, 'Welcome — this is your shared brain.', NEW.id);
  RETURN NEW;
END;
$function$;