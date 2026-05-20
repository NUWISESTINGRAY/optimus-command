
-- Rooms
CREATE TABLE public.jwba_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled room',
  status text NOT NULL DEFAULT 'open',
  source_block_id uuid,
  saved_block_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
ALTER TABLE public.jwba_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rooms" ON public.jwba_rooms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Members
CREATE TABLE public.jwba_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.jwba_rooms(id) ON DELETE CASCADE,
  agent_codename text,
  role text NOT NULL DEFAULT 'agent',
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz
);
ALTER TABLE public.jwba_room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own room members" ON public.jwba_room_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.jwba_rooms r WHERE r.id = room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jwba_rooms r WHERE r.id = room_id AND r.user_id = auth.uid()));
CREATE INDEX idx_jwba_room_members_room ON public.jwba_room_members(room_id);

-- Messages
CREATE TABLE public.jwba_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.jwba_rooms(id) ON DELETE CASCADE,
  sender_kind text NOT NULL,
  agent_codename text,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jwba_room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own room messages" ON public.jwba_room_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.jwba_rooms r WHERE r.id = room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jwba_rooms r WHERE r.id = room_id AND r.user_id = auth.uid()));
CREATE INDEX idx_jwba_room_messages_room ON public.jwba_room_messages(room_id, created_at);

-- Agent positions
CREATE TABLE public.jwba_agent_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_codename text NOT NULL,
  x double precision NOT NULL DEFAULT 0,
  y double precision NOT NULL DEFAULT 0,
  pinned boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_codename)
);
ALTER TABLE public.jwba_agent_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agent positions" ON public.jwba_agent_positions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.jwba_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jwba_room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jwba_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jwba_agent_positions;
ALTER TABLE public.jwba_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.jwba_room_members REPLICA IDENTITY FULL;
ALTER TABLE public.jwba_room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.jwba_agent_positions REPLICA IDENTITY FULL;
