import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AutomationRuns() {
  const { id } = useParams();
  const [runs, setRuns] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [nodeRuns, setNodeRuns] = useState<any[]>([]);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const { data } = await supabase.from("automation_runs").select("*").eq("workflow_id", id).order("started_at", { ascending: false }).limit(50);
    setRuns(data || []);
  }

  async function open(r: any) {
    setSelected(r);
    const { data } = await supabase.from("automation_node_runs").select("*").eq("run_id", r.id).order("started_at");
    setNodeRuns(data || []);
  }

  const badge = (s: string) => {
    const map: Record<string, string> = {
      completed: "bg-emerald-500/10 text-emerald-400",
      running: "bg-amber-500/10 text-amber-400",
      failed: "bg-red-500/10 text-red-400",
      paused: "bg-primary/10 text-primary",
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${map[s] || "bg-secondary"}`}>{s}</span>;
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/automations/${id}`} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><ArrowLeft className="w-4 h-4" /></Link>
        <h1 className="text-2xl font-display font-bold">Run History</h1>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          {runs.map((r) => (
            <button key={r.id} onClick={() => open(r)} className={`w-full glass-panel-hover p-3 text-left flex items-center gap-3 ${selected?.id === r.id ? "border-primary/40" : ""}`}>
              {badge(r.status)}
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">{r.trigger_source}</div>
                <div className="text-xs">{new Date(r.started_at).toLocaleString()}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
          {runs.length === 0 && <div className="glass-panel p-8 text-center text-sm text-muted-foreground"><Clock className="w-6 h-6 mx-auto mb-2" />No runs yet.</div>}
        </div>
        {selected && (
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center gap-2">{badge(selected.status)}<span className="text-xs text-muted-foreground">{new Date(selected.started_at).toLocaleString()}</span></div>
            {selected.error && <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{selected.error}</div>}
            <div className="space-y-2">
              {nodeRuns.map((nr) => (
                <details key={nr.id} className="rounded-md border border-border bg-secondary/30">
                  <summary className="px-3 py-2 cursor-pointer flex items-center gap-2 text-xs">
                    {badge(nr.status)} <span className="font-mono">{nr.node_key}</span>
                    {nr.error && <span className="text-red-400 ml-auto truncate max-w-[200px]">{nr.error}</span>}
                  </summary>
                  <div className="p-3 border-t border-border space-y-2">
                    <div><div className="text-[10px] uppercase text-muted-foreground">Input</div><pre className="text-[10px] bg-background p-2 rounded overflow-auto max-h-40">{JSON.stringify(nr.input_json, null, 2)}</pre></div>
                    <div><div className="text-[10px] uppercase text-muted-foreground">Output</div><pre className="text-[10px] bg-background p-2 rounded overflow-auto max-h-40">{JSON.stringify(nr.output_json, null, 2)}</pre></div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}