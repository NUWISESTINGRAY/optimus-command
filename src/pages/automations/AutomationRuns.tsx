import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  PauseCircle,
  Copy,
  AlertTriangle,
  Timer,
  Play,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

function fmtDuration(ms: number | null): string {
  if (ms == null || isNaN(ms)) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

function durationMs(start?: string | null, end?: string | null): number | null {
  if (!start) return null;
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, e - s);
}

function StatusIcon({ status }: { status: string }) {
  const cls = "w-3.5 h-3.5";
  if (status === "completed") return <CheckCircle2 className={`${cls} text-emerald-400`} />;
  if (status === "failed") return <XCircle className={`${cls} text-red-400`} />;
  if (status === "running") return <Loader2 className={`${cls} text-amber-400 animate-spin`} />;
  if (status === "paused") return <PauseCircle className={`${cls} text-primary`} />;
  return <Clock className={`${cls} text-muted-foreground`} />;
}

export default function AutomationRuns() {
  const { id } = useParams();
  const [runs, setRuns] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [nodeRuns, setNodeRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<any>(null);

  useEffect(() => { load(); }, [id]);

  // Realtime subscription for live node-run updates of the selected run
  useEffect(() => {
    if (!selected?.id) return;
    const ch = supabase
      .channel(`run-${selected.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "automation_node_runs", filter: `run_id=eq.${selected.id}` },
        () => loadNodeRuns(selected.id),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "automation_runs", filter: `id=eq.${selected.id}` },
        (p) => setSelected((s: any) => (s ? { ...s, ...(p.new as any) } : s)),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected?.id]);

  async function load() {
    setLoading(true);
    const [{ data: runsData }, { data: wf }] = await Promise.all([
      supabase.from("automation_runs").select("*").eq("workflow_id", id).order("started_at", { ascending: false }).limit(100),
      supabase.from("automation_workflows").select("id,name,description").eq("id", id).maybeSingle(),
    ]);
    setRuns(runsData || []);
    setWorkflow(wf);
    setLoading(false);
    if (runsData && runsData.length && !selected) open(runsData[0]);
  }

  async function loadNodeRuns(runId: string) {
    const { data } = await supabase
      .from("automation_node_runs")
      .select("*")
      .eq("run_id", runId)
      .order("started_at");
    setNodeRuns(data || []);
  }

  async function open(r: any) {
    setSelected(r);
    await loadNodeRuns(r.id);
  }

  function copyJson(obj: any) {
    navigator.clipboard.writeText(JSON.stringify(obj ?? {}, null, 2));
    toast({ title: "Copied", description: "JSON copied to clipboard" });
  }

  const badge = (s: string) => {
    const map: Record<string, string> = {
      completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      running: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      failed: "bg-red-500/10 text-red-400 border-red-500/20",
      paused: "bg-primary/10 text-primary border-primary/20",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wider ${map[s] || "bg-secondary border-border"}`}>
        <StatusIcon status={s} />
        {s}
      </span>
    );
  };

  // Trace metrics for selected run
  const trace = useMemo(() => {
    if (!selected || nodeRuns.length === 0) return null;
    const runStart = new Date(selected.started_at).getTime();
    const runEnd = selected.completed_at ? new Date(selected.completed_at).getTime() : Date.now();
    const totalSpan = Math.max(1, runEnd - runStart);
    const items = nodeRuns.map((nr) => {
      const s = new Date(nr.started_at).getTime();
      const e = nr.completed_at ? new Date(nr.completed_at).getTime() : runEnd;
      return {
        ...nr,
        durationMs: e - s,
        offsetMs: s - runStart,
        leftPct: ((s - runStart) / totalSpan) * 100,
        widthPct: Math.max(0.5, ((e - s) / totalSpan) * 100),
      };
    });
    const completedDurations = items.filter((i) => i.status !== "running").map((i) => i.durationMs);
    const slowest = items.reduce((a, b) => (a.durationMs > b.durationMs ? a : b), items[0]);
    return {
      items,
      totalSpan,
      runStart,
      runEnd,
      counts: {
        completed: items.filter((i) => i.status === "completed").length,
        failed: items.filter((i) => i.status === "failed").length,
        running: items.filter((i) => i.status === "running").length,
      },
      avg: completedDurations.length ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length : 0,
      slowest,
    };
  }, [selected, nodeRuns]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/automations/${id}`} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold">Run History</h1>
          {workflow && <p className="text-xs text-muted-foreground">{workflow.name}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        {/* Left: Run list */}
        <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
          {loading && <div className="text-xs text-muted-foreground p-4">Loading…</div>}
          {!loading && runs.length === 0 && (
            <div className="glass-panel p-8 text-center text-sm text-muted-foreground">
              <Clock className="w-6 h-6 mx-auto mb-2" />No runs yet.
            </div>
          )}
          {runs.map((r) => {
            const dur = durationMs(r.started_at, r.completed_at);
            const active = selected?.id === r.id;
            return (
              <button
                key={r.id}
                onClick={() => open(r)}
                className={`w-full glass-panel-hover p-3 text-left flex items-center gap-3 transition-all ${active ? "border-primary/60 ring-1 ring-primary/30" : ""}`}
              >
                {badge(r.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.trigger_source}</div>
                  <div className="text-xs truncate">{new Date(r.started_at).toLocaleString()}</div>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Timer className="w-3 h-3" />{fmtDuration(dur)}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Right: Trace viewer */}
        {selected ? (
          <div className="space-y-4">
            {/* Run summary */}
            <div className="glass-panel p-4 space-y-3">
              <div className="flex items-start gap-3 flex-wrap">
                {badge(selected.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">Run ID</div>
                  <div className="text-xs font-mono truncate">{selected.id}</div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Started</div>
                    <div>{new Date(selected.started_at).toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Duration</div>
                    <div className="font-mono">{fmtDuration(durationMs(selected.started_at, selected.completed_at))}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Trigger</div>
                    <div>{selected.trigger_source}</div>
                  </div>
                </div>
              </div>

              {trace && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
                  <div className="rounded bg-secondary/40 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Nodes</div>
                    <div className="text-sm font-semibold">{trace.items.length}</div>
                  </div>
                  <div className="rounded bg-emerald-500/5 p-2">
                    <div className="text-[10px] uppercase text-emerald-400/80">Completed</div>
                    <div className="text-sm font-semibold text-emerald-400">{trace.counts.completed}</div>
                  </div>
                  <div className="rounded bg-red-500/5 p-2">
                    <div className="text-[10px] uppercase text-red-400/80">Failed</div>
                    <div className="text-sm font-semibold text-red-400">{trace.counts.failed}</div>
                  </div>
                  <div className="rounded bg-secondary/40 p-2">
                    <div className="text-[10px] uppercase text-muted-foreground">Avg / node</div>
                    <div className="text-sm font-semibold font-mono">{fmtDuration(trace.avg)}</div>
                  </div>
                </div>
              )}

              {selected.error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-mono whitespace-pre-wrap break-all">{selected.error}</div>
                </div>
              )}
            </div>

            {/* Timeline */}
            {trace && trace.items.length > 0 && (
              <div className="glass-panel p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Timeline</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">total {fmtDuration(trace.totalSpan)}</span>
                </div>
                <div className="space-y-1.5">
                  {trace.items.map((it) => (
                    <div key={it.id} className="grid grid-cols-[160px_1fr_70px] items-center gap-2 text-[11px]">
                      <div className="font-mono truncate flex items-center gap-1.5">
                        <StatusIcon status={it.status} />
                        <span className="truncate">{it.node_key}</span>
                      </div>
                      <div className="relative h-4 bg-secondary/30 rounded">
                        <div
                          className={`absolute h-full rounded ${
                            it.status === "failed" ? "bg-red-500/60" :
                            it.status === "running" ? "bg-amber-400/60 animate-pulse" :
                            it.status === "paused" ? "bg-primary/60" :
                            "bg-emerald-500/60"
                          }`}
                          style={{ left: `${it.leftPct}%`, width: `${it.widthPct}%` }}
                          title={`${it.node_key} • ${fmtDuration(it.durationMs)}`}
                        />
                      </div>
                      <div className="text-right font-mono text-muted-foreground">{fmtDuration(it.durationMs)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-node details */}
            <div className="space-y-2">
              {trace?.items.map((nr) => (
                <details key={nr.id} className="rounded-md border border-border bg-secondary/20 group" open={nr.status === "failed"}>
                  <summary className="px-3 py-2.5 cursor-pointer flex items-center gap-3 text-xs hover:bg-secondary/40 transition-colors list-none">
                    {badge(nr.status)}
                    <span className="font-mono font-medium">{nr.node_key}</span>
                    <span className="text-muted-foreground hidden sm:inline">+{fmtDuration(nr.offsetMs)}</span>
                    <span className="ml-auto flex items-center gap-3 text-muted-foreground">
                      <span className="font-mono flex items-center gap-1"><Timer className="w-3 h-3" />{fmtDuration(nr.durationMs)}</span>
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                    </span>
                  </summary>
                  <div className="p-3 border-t border-border space-y-3">
                    <div className="grid sm:grid-cols-3 gap-2 text-[10px]">
                      <div className="bg-background/50 rounded p-2">
                        <div className="uppercase text-muted-foreground flex items-center gap-1"><Play className="w-3 h-3" />Started</div>
                        <div className="font-mono mt-0.5">{new Date(nr.started_at).toLocaleTimeString([], { hour12: false })}.{String(new Date(nr.started_at).getMilliseconds()).padStart(3, "0")}</div>
                      </div>
                      <div className="bg-background/50 rounded p-2">
                        <div className="uppercase text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Ended</div>
                        <div className="font-mono mt-0.5">{nr.completed_at ? `${new Date(nr.completed_at).toLocaleTimeString([], { hour12: false })}.${String(new Date(nr.completed_at).getMilliseconds()).padStart(3, "0")}` : "—"}</div>
                      </div>
                      <div className="bg-background/50 rounded p-2">
                        <div className="uppercase text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" />Duration</div>
                        <div className="font-mono mt-0.5">{fmtDuration(nr.durationMs)}</div>
                      </div>
                    </div>

                    {nr.error && (
                      <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2 flex gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div className="flex-1 font-mono whitespace-pre-wrap break-all">{nr.error}</div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><ArrowDownToLine className="w-3 h-3" />Input</div>
                          <button onClick={() => copyJson(nr.input_json)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><Copy className="w-3 h-3" /></button>
                        </div>
                        <pre className="text-[10px] bg-background p-2 rounded overflow-auto max-h-60 font-mono leading-relaxed">{JSON.stringify(nr.input_json, null, 2)}</pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><ArrowUpFromLine className="w-3 h-3" />Output</div>
                          <button onClick={() => copyJson(nr.output_json)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><Copy className="w-3 h-3" /></button>
                        </div>
                        <pre className="text-[10px] bg-background p-2 rounded overflow-auto max-h-60 font-mono leading-relaxed">{JSON.stringify(nr.output_json, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
              {nodeRuns.length === 0 && (
                <div className="glass-panel p-6 text-center text-xs text-muted-foreground">No node executions recorded for this run.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-panel p-12 text-center text-sm text-muted-foreground">
            Select a run to inspect its node trace.
          </div>
        )}
      </div>
    </div>
  );
}