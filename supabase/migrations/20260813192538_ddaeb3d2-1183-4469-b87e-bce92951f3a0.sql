INSERT INTO public.user_roles (user_id, role)
VALUES ('88e2e7a0-c8a9-429f-b23f-4e73e204fac5','admin'),
       ('c4696f36-c2ca-401a-9235-e9bb2882c06a','admin')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE POLICY "admins insert agents" ON public.jwba_agents
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update agents" ON public.jwba_agents
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete agents" ON public.jwba_agents
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.jwba_agents TO authenticated;