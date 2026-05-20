import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface RoomCtx {
  openRoomId: string | null;
  openRoom: (initialAgent?: string) => Promise<void>;
  closeOverlay: () => void;
  setOpenRoomId: (id: string | null) => void;
}

const Ctx = createContext<RoomCtx | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [openRoomId, setOpenRoomId] = useState<string | null>(null);

  // Restore open room on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("jwba_rooms")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOpenRoomId(data.id);
      });
  }, [user]);

  const openRoom = useCallback(
    async (initialAgent?: string) => {
      if (!user) return;
      const { data: room, error } = await supabase
        .from("jwba_rooms")
        .insert({ user_id: user.id, title: initialAgent ? `Room with ${initialAgent}` : "New room" })
        .select()
        .single();
      if (error || !room) {
        toast({ title: "Could not start room", description: error?.message });
        return;
      }
      const members: any[] = [{ room_id: room.id, role: "host", agent_codename: null }];
      if (initialAgent) members.push({ room_id: room.id, role: "agent", agent_codename: initialAgent });
      await supabase.from("jwba_room_members").insert(members);
      setOpenRoomId(room.id);
    },
    [user]
  );

  const closeOverlay = useCallback(() => setOpenRoomId(null), []);

  return <Ctx.Provider value={{ openRoomId, openRoom, closeOverlay, setOpenRoomId }}>{children}</Ctx.Provider>;
}

export function useRoomCtx() {
  const c = useContext(Ctx);
  if (!c) throw new Error("RoomProvider missing");
  return c;
}