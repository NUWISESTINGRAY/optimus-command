ALTER TABLE public.telegram_connections ADD CONSTRAINT telegram_connections_user_id_key UNIQUE (user_id);

-- Reset the latest link code so user can retry
UPDATE public.telegram_link_codes SET used = false WHERE code = 'C8HSFO';