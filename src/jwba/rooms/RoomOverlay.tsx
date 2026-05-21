import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRoomCtx } from "./RoomContext";
import { AgentChip } from "../AgentChip";
import { X, Send, Plus, Megaphone, ArrowRight, Save, Loader2, Users, Swords } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Msg {
  id: string;
  room_id: string;
  sender_kind: "user" | "agent";
  agent_codename: string | null;
  content: string;
  created_at: string;
}
interface Member {
  id: string;
  room_id: string;
  agent_codename: string | null;
  role: string;
  left_at: string | null;
}

export function RoomOverlay() {
  const { openRoomId, setOpenRoomId, closeOverlay } = useRoomCtx();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"round-robin" | "broadcast" | "handoff" | "meeting" | "debate">("round-robin");
  const [handoffTo, setHandoffTo] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("jwba_agents").select("*").order("sort_order").then(({ data }) => setAllAgents(data ?? []));
  }, []);

  useEffect(() => {
    if (!openRoomId) return;
    let cancelled = false;
    (async () => {
      const [{ data: msgs }, { data: mems }] = await Promise.all([
        supabase.from("jwba_room_messages").select("*").eq("room_id", openRoomId).order("created_at"),
        supabase.from("jwba_room_members").select("*").eq("room_id", openRoomId).is("left_at", null),
      ]);
      if (cancelled) return;
      setMessages((msgs ?? []) as Msg[]);
      setMembers((mems ?? []) as Member[]);
    })();
    const ch = supabase
      .channel(`jwba-room-${openRoomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jwba_room_messages", filter: `room_id=eq.${openRoomId}` }, (p) =>
        setMessages((prev) => (prev.find((m) => m.id === (p.new as any).id) ? prev : [...prev, p.new as Msg]))
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "jwba_room_members", filter: `room_id=eq.${openRoomId}` }, async () => {
        const { data } = await supabase.from("jwba_room_members").select("*").eq("room_id", openRoomId).is("left_at", null);
        setMembers((data ?? []) as Member[]);
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [openRoomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!openRoomId) return null;

  const agentMembers = members.filter((m) => m.role === "agent" && m.agent_codename);
  const availableAgents = allAgents.filter((a) => !agentMembers.find((m) => m.agent_codename === a.codename));

  const send = async () => {
    if (!input.trim() || sending) return;
    if (agentMembers.length === 0) {
      toast({ title: "Add an agent first" });
      return;
    }
    setSending(true);
    const prompt = input;
    setInput("");
    try {
      const { error } = await supabase.functions.invoke("jwba-room-turn", {
        body: { room_id: openRoomId, prompt, mode, target_agent: mode === "handoff" ? handoffTo : undefined },
      });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: "Turn failed", description: e.message });
    } finally {
      setSending(false);
    }
  };

  const addAgent = async (codename: string) => {
    await supabase.from("jwba_room_members").insert({ room_id: openRoomId, role: "agent", agent_codename: codename });
    setShowPicker(false);
  };

  const removeAgent = async (mid: string) => {
    await supabase.from("jwba_room_members").update({ left_at: new Date().toISOString() }).eq("id", mid);
  };

  const startMeeting = async () => {
    if (!openRoomId) return;
    const executive = ["optimus", "athena", "cipher", "nova", "atlas", "sentinel"];
    const toAdd = executive.filter((c) => !agentMembers.find((m) => m.agent_codename === c));
    if (toAdd.length) {
      await supabase.from("jwba_room_members").insert(
        toAdd.map((c) => ({ room_id: openRoomId, role: "agent", agent_codename: c }))
      );
    }
    setMode("meeting");
    toast({ title: "Meeting started", description: "Executive panel added. Drop your agenda below." });
  };

  const endAndSave = async () => {
    // Find today's daily page or first page
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    let { data: page } = await supabase.from("jwba_pages").select("id").eq("tenant_id", user.id).eq("daily_date", today).maybeSingle();
    if (!page) {
      const ins = await supabase.from("jwba_pages").insert({ tenant_id: user.id, title: today, is_daily: true, daily_date: today }).select().single();
      page = ins.data;
    }
    if (!page) return;
    try {
      const { error } = await supabase.functions.invoke("jwba-room-save", { body: { room_id: openRoomId, target_page_id: page.id } });
      if (error) throw error;
      toast({ title: "Saved to today's daily note" });
      setOpenRoomId(null);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message });
    }
  };

  const discard = async () => {
    if (!confirm("Discard this room without saving?")) return;
    await supabase.from("jwba_rooms").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", openRoomId);
    setOpenRoomId(null);
  };

  return (
    <div className="fixed bottom-4 right-4 w-[420px] h-[600px] bg-card border border-border rounded-lg shadow-2xl flex flex-col z-50 animate-slide-up">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground mr-1">Room</span>
          {agentMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-0.5">
              <AgentChip codename={m.agent_codename!} />
              <button onClick={() => removeAgent(m.id)} className="text-muted-foreground hover:text-foreground text-xs">×</button>
            </div>
          ))}
          <button onClick={() => setShowPicker((v) => !v)} className="p-1 hover:bg-secondary rounded text-muted-foreground" title="Add agent">
            <Plus className="w-3 h-3" />
          </button>
          <button onClick={startMeeting} className="p-1 hover:bg-secondary rounded text-muted-foreground flex items-center gap-1 text-[10px]" title="Start executive meeting">
            <Users className="w-3 h-3" /> meeting
          </button>
        </div>
        <button onClick={closeOverlay} className="p-1 hover:bg-secondary rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {showPicker && (
        <div className="border-b border-border bg-secondary/30 p-2 max-h-40 overflow-y-auto">
          {availableAgents.length === 0 && <div className="text-xs text-muted-foreground italic">All agents in room</div>}
          {availableAgents.map((a) => (
            <button key={a.codename} onClick={() => addAgent(a.codename)} className="block w-full text-left px-2 py-1 hover:bg-secondary rounded text-xs font-mono">
              + {a.display_name}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground italic mt-8">Drop a prompt — agents will reply in turn.</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.sender_kind === "user" ? "ml-8" : "mr-8"}>
            <div className="flex items-center gap-2 mb-1">
              {m.sender_kind === "agent" && m.agent_codename ? (
                <AgentChip codename={m.agent_codename} />
              ) : (
                <span className="text-[11px] font-mono text-primary">you</span>
              )}
              <span className="text-[10px] text-muted-foreground font-mono">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div
              className={`text-[13px] leading-relaxed rounded-md px-3 py-2 ${
                m.sender_kind === "user" ? "bg-primary/10 border border-primary/20" : "bg-secondary/40 border border-border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Agents thinking…
          </div>
        )}
      </div>

      <div className="border-t border-border p-2 space-y-2">
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <button
            onClick={() => setMode("round-robin")}
            className={`px-2 py-0.5 rounded ${mode === "round-robin" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
          >
            round-robin
          </button>
          <button
            onClick={() => setMode("broadcast")}
            className={`px-2 py-0.5 rounded flex items-center gap-1 ${mode === "broadcast" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
          >
            <Megaphone className="w-2.5 h-2.5" /> ask all
          </button>
          <button
            onClick={() => setMode("meeting")}
            className={`px-2 py-0.5 rounded flex items-center gap-1 ${mode === "meeting" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
          >
            <Users className="w-2.5 h-2.5" /> meeting
          </button>
          <button
            onClick={() => setMode("debate")}
            className={`px-2 py-0.5 rounded flex items-center gap-1 ${mode === "debate" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
          >
            <Swords className="w-2.5 h-2.5" /> debate
          </button>
          <select
            value={mode === "handoff" ? handoffTo ?? "" : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                setMode("handoff");
                setHandoffTo(v);
              }
            }}
            className="bg-secondary/50 text-[10px] rounded px-1 py-0.5 outline-none"
          >
            <option value="">handoff →</option>
            {agentMembers.map((m) => (
              <option key={m.id} value={m.agent_codename!}>
                {m.agent_codename}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={discard} className="text-[10px] text-muted-foreground hover:text-destructive px-2 py-0.5">discard</button>
            <button onClick={endAndSave} className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25">
              <Save className="w-2.5 h-2.5" /> end & save
            </button>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Message the room…"
            className="flex-1 bg-secondary/40 rounded px-2 py-1.5 text-[13px] outline-none resize-none focus:bg-secondary"
          />
          <button onClick={send} disabled={sending || !input.trim()} className="p-2 rounded bg-primary text-primary-foreground disabled:opacity-50">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}