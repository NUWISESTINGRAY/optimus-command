import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { Calendar, FileText, Bot, Search } from "lucide-react";
import { agentColor } from "./lib/agentColors";

export function LeftSidebar({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [pages, setPages] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ps } = await supabase
        .from("jwba_pages")
        .select("id,title,is_daily")
        .eq("tenant_id", user.id)
        .eq("is_daily", false)
        .order("title");
      setPages(ps ?? []);
      const { data: as } = await supabase.from("jwba_agents").select("*").order("sort_order");
      setAgents(as ?? []);
    })();
  }, [user]);

  if (collapsed) return null;

  const today = format(new Date(), "yyyy-MM-dd");
  const dailies = Array.from({ length: 7 }).map((_, i) => {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    return { date: d, label: i === 0 ? "Today" : format(subDays(new Date(), i), "EEE, MMM d") };
  });

  const filteredPages = pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className="w-60 border-r border-border bg-sidebar/60 flex flex-col overflow-y-auto">
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
          <Calendar className="w-3 h-3" /> Daily
        </div>
        <div className="space-y-0.5">
          {dailies.map((d) => (
            <NavLink
              key={d.date}
              to={`/workspace/daily/${d.date}`}
              className={`block px-2 py-1 rounded text-[13px] font-mono ${
                pathname.includes(d.date)
                  ? "bg-primary/15 text-primary"
                  : "text-foreground/80 hover:bg-secondary/50"
              } ${d.date === today ? "font-semibold" : ""}`}
            >
              {d.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
          <FileText className="w-3 h-3" /> Pages
        </div>
        <div className="relative mb-2">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-7 pr-2 py-1 bg-secondary/40 rounded text-[12px] font-mono outline-none focus:bg-secondary"
          />
        </div>
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {filteredPages.map((p) => (
            <NavLink
              key={p.id}
              to={`/workspace/page/${p.id}`}
              className={({ isActive }) =>
                `block px-2 py-1 rounded text-[13px] truncate ${
                  isActive ? "bg-primary/15 text-primary" : "text-foreground/80 hover:bg-secondary/50"
                }`
              }
            >
              {p.title}
            </NavLink>
          ))}
          {filteredPages.length === 0 && (
            <div className="text-[11px] text-muted-foreground italic px-2 py-1">No pages yet</div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
          <Bot className="w-3 h-3" /> Agents
        </div>
        <div className="space-y-0.5">
          {agents.map((a) => {
            const c = agentColor(a.codename);
            return (
              <div
                key={a.codename}
                className="flex items-center justify-between px-2 py-1 rounded text-[13px] hover:bg-secondary/50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${a.status === "working" ? "bg-amber-400 animate-pulse" : c.dot}`} />
                  <span className="font-mono">{a.display_name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}