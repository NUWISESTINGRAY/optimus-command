import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { agentColor, agentHsl } from "../lib/agentColors";
import { agentAvatar } from "../lib/agentAvatars";
import { useRoomCtx } from "../rooms/RoomContext";
import { User } from "lucide-react";

interface Agent {
  codename: string;
  display_name: string;
  status: string;
  sort_order: number;
}
interface Pos {
  agent_codename: string;
  x: number;
  y: number;
  pinned: boolean;
}

const W = 800;
const H = 600;

export default function TeamMap() {
  const { user } = useAuth();
  const { openRoomId, openRoom } = useRoomCtx();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [roomMembers, setRoomMembers] = useState<string[]>([]);
  const dragRef = useRef<{ code: string; offX: number; offY: number } | null>(null);

  // Load agents + positions
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ags } = await supabase.from("jwba_agents").select("*").order("sort_order");
      setAgents((ags ?? []) as Agent[]);
      const { data: ps } = await supabase.from("jwba_agent_positions").select("*").eq("user_id", user.id);
      const map: Record<string, Pos> = {};
      (ps ?? []).forEach((p: any) => (map[p.agent_codename] = p));
      setPositions(map);
    })();
  }, [user]);

  // Realtime: agent status + room members of open room
  useEffect(() => {
    const ch = supabase
      .channel("jwba-map-agents")
      .on("postgres_changes", { event: "*", schema: "public", table: "jwba_agents" }, async () => {
        const { data } = await supabase.from("jwba_agents").select("*").order("sort_order");
        setAgents((data ?? []) as Agent[]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (!openRoomId) {
      setRoomMembers([]);
      return;
    }
    const load = async () => {
      const { data } = await supabase.from("jwba_room_members").select("agent_codename").eq("room_id", openRoomId).is("left_at", null);
      setRoomMembers((data ?? []).map((d: any) => d.agent_codename).filter(Boolean));
    };
    load();
    const ch = supabase
      .channel(`jwba-map-room-${openRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jwba_room_members", filter: `room_id=eq.${openRoomId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [openRoomId]);

  // Default circular layout for unpinned agents
  const layout = useMemo(() => {
    const cx = W / 2;
    const cy = H / 2;
    const out: Record<string, { x: number; y: number }> = {};
    const execs = agents.filter((a) => a.sort_order <= 7);
    const specs = agents.filter((a) => a.sort_order > 7);
    const place = (list: Agent[], radius: number) => {
      list.forEach((a, i) => {
      const p = positions[a.codename];
      if (p && p.pinned) {
        out[a.codename] = { x: p.x, y: p.y };
      } else {
          const angle = (i / Math.max(list.length, 1)) * Math.PI * 2 - Math.PI / 2;
          out[a.codename] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
      }
    });
    };
    place(execs, 150);
    place(specs, 260);
    return out;
  }, [agents, positions]);

  const onMouseDown = (e: React.MouseEvent, code: string) => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
    const rect = svg.getBoundingClientRect();
    const pos = layout[code];
    dragRef.current = {
      code,
      offX: ((e.clientX - rect.left) / rect.width) * W - pos.x,
      offY: ((e.clientY - rect.top) / rect.height) * H - pos.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W - dragRef.current.offX;
    const y = ((e.clientY - rect.top) / rect.height) * H - dragRef.current.offY;
    const code = dragRef.current.code;
    setPositions((p) => ({ ...p, [code]: { agent_codename: code, x, y, pinned: true } }));
  };

  const onMouseUp = async () => {
    if (!dragRef.current || !user) return;
    const code = dragRef.current.code;
    const p = positions[code];
    dragRef.current = null;
    if (p) {
      await supabase
        .from("jwba_agent_positions")
        .upsert({ user_id: user.id, agent_codename: code, x: p.x, y: p.y, pinned: true }, { onConflict: "user_id,agent_codename" });
    }
  };

  const statusRing = (status: string, inRoom: boolean) => {
    if (inRoom) return "hsl(190 90% 60%)"; // cyan
    if (status === "working") return "hsl(38 92% 60%)"; // amber
    if (status === "error") return "hsl(0 80% 60%)";
    return "hsl(220 10% 35%)";
  };

  return (
    <div className="h-full w-full p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Team Map</h1>
          <p className="text-xs text-muted-foreground font-mono">click an agent to drop into a room · drag to pin position</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted" /> idle</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> working</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> in room</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/30 overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[calc(100vh-180px)] cursor-default"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            <radialGradient id="grid" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(220 30% 12%)" />
              <stop offset="100%" stopColor="hsl(220 30% 6%)" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />

          {/* connections between in-room agents */}
          {roomMembers.length > 1 &&
            roomMembers.flatMap((a, i) =>
              roomMembers.slice(i + 1).map((b) => {
                const pa = layout[a];
                const pb = layout[b];
                if (!pa || !pb) return null;
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke="hsl(190 90% 60% / 0.5)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1s" repeatCount="indefinite" />
                  </line>
                );
              })
            )}

          {/* user node center */}
          <g transform={`translate(${W / 2}, ${H / 2})`}>
            <circle r={26} fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={2} />
            <foreignObject x={-12} y={-12} width={24} height={24}>
              <div className="flex items-center justify-center text-primary"><User className="w-5 h-5" /></div>
            </foreignObject>
            <text y={48} textAnchor="middle" className="fill-foreground text-[11px] font-mono">you</text>
          </g>

          {/* agent nodes */}
          {agents.map((a) => {
            const p = layout[a.codename];
            if (!p) return null;
            const c = agentColor(a.codename);
            const hsl = agentHsl(a.codename);
            const inRoom = roomMembers.includes(a.codename);
            const ring = statusRing(a.status, inRoom);
            const avatar = agentAvatar(a.codename);
            const clipId = `clip-${a.codename}`;
            return (
              <g
                key={a.codename}
                transform={`translate(${p.x}, ${p.y})`}
                onMouseDown={(e) => onMouseDown(e, a.codename)}
                onClick={() => {
                  if (dragRef.current) return;
                  if (!openRoomId) openRoom(a.codename);
                }}
                style={{ cursor: "pointer" }}
              >
                {a.status === "working" && (
                  <circle r={28} fill="none" stroke={ring} strokeWidth={1.5} opacity={0.6}>
                    <animate attributeName="r" from="22" to="34" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <defs>
                  <clipPath id={clipId}>
                    <circle r={22} />
                  </clipPath>
                </defs>
                <circle r={24} fill="hsl(220 30% 14%)" stroke={ring} strokeWidth={2.5} />
                {avatar ? (
                  <image
                    href={avatar}
                    x={-22}
                    y={-22}
                    width={44}
                    height={44}
                    clipPath={`url(#${clipId})`}
                    preserveAspectRatio="xMidYMid slice"
                    className="pointer-events-none"
                  />
                ) : (
                  <>
                    <circle r={14} fill={hsl} opacity={0.55} />
                    <text y={5} textAnchor="middle" className="fill-foreground text-[10px] font-mono font-bold pointer-events-none">
                      {a.codename.slice(0, 2).toUpperCase()}
                    </text>
                  </>
                )}
                <text y={42} textAnchor="middle" className="fill-foreground text-[10px] font-mono pointer-events-none">
                  {a.display_name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}