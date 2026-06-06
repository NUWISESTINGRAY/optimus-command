import { format } from "date-fns";
import { Brain, Search, PanelLeft, PanelRight, Network, Radio, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRoomCtx } from "./rooms/RoomContext";

interface Props {
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

export function TopBar({ onToggleLeft, onToggleRight }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { openRoom } = useRoomCtx();
  const [tgActive, setTgActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("telegram_connections")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => setTgActive(!!data));
  }, [user]);

  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-3 bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button onClick={onToggleLeft} className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
          <PanelLeft className="w-4 h-4" />
        </button>
        <Link to="/workspace" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-display font-bold tracking-wide text-sm">JWBA Workspace</span>
        </Link>
        <span className="text-xs text-muted-foreground font-mono ml-2">
          {format(new Date(), "EEE, MMM d yyyy")}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-1 max-w-md mx-6">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-secondary/40 rounded text-muted-foreground text-xs">
          <Search className="w-3 h-3" />
          <span>Search pages, blocks...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-border">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => openRoom()}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 text-[11px] font-mono"
          title="Drop into a meeting room"
        >
          <Radio className="w-3 h-3" /> Start room
        </button>
        <button
          onClick={() => nav("/workspace/graph")}
          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
          title="Graph view"
        >
          <Network className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <span className={`w-1.5 h-1.5 rounded-full ${tgActive ? "bg-emerald-400" : "bg-amber-400"}`} />
          Telegram
        </div>
        <button onClick={onToggleRight} className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}