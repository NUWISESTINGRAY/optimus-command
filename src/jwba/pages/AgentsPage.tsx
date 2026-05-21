import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { agentColor, agentHsl } from "../lib/agentColors";
import { agentAvatar } from "../lib/agentAvatars";
import { useRoomCtx } from "../rooms/RoomContext";
import { MessageSquare } from "lucide-react";

interface Agent {
  codename: string;
  display_name: string;
  sort_order: number;
  status: string;
  spec: any;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const { openRoom } = useRoomCtx();

  useEffect(() => {
    supabase.from("jwba_agents").select("*").order("sort_order").then(({ data }) => setAgents((data ?? []) as Agent[]));
  }, []);

  const execs = agents.filter((a) => a.sort_order <= 7);
  const specs = agents.filter((a) => a.sort_order > 7);

  const renderCard = (a: Agent) => {
    const c = agentColor(a.codename);
    const hsl = agentHsl(a.codename);
    const avatar = agentAvatar(a.codename);
    return (
      <div key={a.codename} className="rounded-lg border border-border bg-card/40 p-4 hover:border-primary/40 transition-colors">
        <div className="flex items-start gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={`${a.display_name} portrait`}
              loading="lazy"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              style={{ border: `2px solid ${hsl}`, boxShadow: `0 0 12px ${hsl}55` }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-mono text-[11px] font-bold flex-shrink-0"
              style={{ background: hsl + "33", border: `2px solid ${hsl}`, color: hsl }}
            >
              {a.codename.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{a.display_name}</h3>
              <span className={`w-1.5 h-1.5 rounded-full ${a.status === "working" ? "bg-amber-400 animate-pulse" : c.dot}`} />
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">{a.spec?.role}</p>
          </div>
        </div>
        <p className="text-[12px] text-foreground/70 mt-3 leading-relaxed">{a.spec?.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {(a.spec?.expertise ?? []).slice(0, 4).map((e: string) => (
            <span key={e} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">{e}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <code className="text-[10px] font-mono text-primary">{a.spec?.slash}</code>
          <button
            onClick={() => openRoom(a.codename)}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-primary/15 text-primary hover:bg-primary/25"
          >
            <MessageSquare className="w-3 h-3" /> Start room
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">JW Brand AI Team</h1>
        <p className="text-xs text-muted-foreground font-mono">17 agents · click to drop into a room</p>
      </div>
      <section>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Executive Leadership</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{execs.map(renderCard)}</div>
      </section>
      <section>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Specialists</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{specs.map(renderCard)}</div>
      </section>
    </div>
  );
}