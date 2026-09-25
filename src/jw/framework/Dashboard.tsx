import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, Download } from "lucide-react";
import { db } from "./shared";
import { importPackage, PULSE_PILLARS, PROMPTS_LEVELS, BACKLOG_BATCH_NAME } from "./importPackage";

export default function Dashboard({ go }: { go: (tab: string) => void }) {
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const load = async () => {
    const [fw, items, batch, pulse, prompts, ents, wfs, appr] = await Promise.all([
      db.from("frameworks").select("id, kind, status, name, code"),
      db.from("task_import_items").select("id, external_id, title, status, phase_days, dependencies, actual_due_date, priority, batch_id"),
      db.from("task_import_batches").select("*").eq("name", BACKLOG_BATCH_NAME).maybeSingle(),
      db.from("pulse_assessments").select("*").order("assessed_at", { ascending: false }).limit(1),
      db.from("prompts_maturity").select("*").is("entity_id", null),
      db.from("entities").select("id"),
      supabase.from("atlas_workflows").select("id, active").like("name", "JW W%"),
      supabase.from("approvals").select("id").eq("source_type", "framework_task").eq("status", "pending"),
    ]);
    setS({ fw: fw.data ?? [], items: items.data ?? [], batch: batch.data, pulse: pulse.data?.[0], prompts: prompts.data ?? [],
      ents: ents.data ?? [], wfs: wfs.data ?? [], appr: appr.data ?? [] });
  };
  useEffect(() => { load(); }, []);

  const runImport = async () => {
    setBusy(true); setLog([]);
    try { await importPackage(user!.id, (m) => setLog((l) => [...l, m])); toast.success("Package imported"); await load(); }
    catch (e: any) { toast.error(e.message ?? "Import failed"); }
    finally { setBusy(false); }
  };

  if (!s) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const jwItems = s.batch ? s.items.filter((i: any) => i.batch_id === s.batch.id) : [];
  const by = (st: string) => jwItems.filter((i: any) => i.status === st).length;
  const byExt = Object.fromEntries(jwItems.map((i: any) => [i.external_id, i]));
  const unblocked = jwItems.filter((i: any) => i.status === "proposed" && (i.dependencies ?? []).every((d: string) => ["promoted", "done", "in_progress", "qa"].includes(byExt[d]?.status)));
  const today = new Date().toISOString().slice(0, 10);
  const overdue = jwItems.filter((i: any) => i.status === "promoted" && i.actual_due_date && i.actual_due_date < today);
  const pending = s.fw.filter((f: any) => f.status === "definition_pending");
  const phases = [...new Set(jwItems.map((i: any) => i.phase_days))] as string[];
  const pulseAvg = s.pulse ? (PULSE_PILLARS.reduce((a, p) => a + (Number(s.pulse.scores?.[p.key]) || 0), 0) / 5).toFixed(1) : null;
  let promptsReached = 0;
  for (const l of PROMPTS_LEVELS) { if ((s.prompts.find((r: any) => r.dimension === l.key)?.level ?? 0) >= 3) promptsReached++; else break; }
  const imported = s.fw.length > 0 && !!s.batch;

  const Stat = ({ label, value, sub, tab }: any) => (
    <button onClick={() => tab && go(tab)} className="glass-panel-hover p-4 text-left">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-display font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">JW Framework Implementation Package v1.0</p>
          <p className="text-xs text-muted-foreground">{imported ? "Imported. Re-running only adds missing items; your edits are kept." : "Not yet imported: manual, 16 SOPs, framework registry, specs, 10 workflow drafts, role mappings and 46 proposed tasks."}</p>
          {log.map((l) => <p key={l} className="text-xs text-primary">{l}</p>)}
        </div>
        <Button onClick={runImport} disabled={busy}><Download className="w-4 h-4 mr-2" />{busy ? "Importing…" : imported ? "Re-sync package" : "Import package"}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <Stat label="SOPs" value={s.fw.filter((f: any) => f.kind === "sop").length} sub="versioned" tab="library" />
        <Stat label="Frameworks" value={s.fw.filter((f: any) => f.kind === "framework").length} sub={`${pending.length} definition pending`} tab="library" />
        <Stat label="Proposed tasks" value={by("proposed")} sub={`${jwItems.length} in backlog`} tab="backlog" />
        <Stat label="Awaiting approval" value={s.appr.length} sub="framework tasks" tab="backlog" />
        <Stat label="Activated" value={by("promoted") + by("done")} sub={`${by("done")} done · ${overdue.length} overdue`} tab="backlog" />
        <Stat label="Entities" value={s.ents.length} sub={`${s.wfs.filter((w: any) => !w.active).length}/${s.wfs.length} workflows inactive`} tab="entities" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass-panel p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Backlog progress by phase</p>
          {!s.batch?.kickoff_date && s.batch && <p className="text-xs text-accent">No kickoff date set — due dates remain relative (D+n).</p>}
          {phases.map((p) => {
            const xs = jwItems.filter((i: any) => i.phase_days === p);
            const act = xs.filter((i: any) => ["promoted", "done"].includes(i.status)).length;
            return (
              <div key={p} className="text-xs">
                <div className="flex justify-between text-muted-foreground"><span>Days {p}</span><span>{act}/{xs.length} activated</span></div>
                <div className="h-2 bg-secondary rounded mt-1 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(act / xs.length) * 100}%` }} /></div>
              </div>
            );
          })}
        </div>
        <div className="glass-panel p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Ready to assign next</p>
          <p className="text-xs text-muted-foreground">Proposed tasks whose dependencies are activated.</p>
          {unblocked.slice(0, 8).map((i: any) => (
            <div key={i.id} className="flex items-center gap-2 text-xs"><span className="font-mono text-primary w-10">{i.external_id}</span><span className="flex-1 truncate text-foreground">{i.title}</span><Badge variant="outline">{i.priority}</Badge></div>
          ))}
          {!unblocked.length && <p className="text-xs text-muted-foreground">None.</p>}
        </div>
        <div className="glass-panel p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Health</p>
          <div className="text-xs"><span className="text-muted-foreground">Latest P.U.L.S.E. ({s.pulse?.subject ?? "none"}): </span><span className="text-accent font-semibold">{pulseAvg ?? "not assessed"}</span></div>
          <div className="text-xs"><span className="text-muted-foreground">PROMPTS (portfolio): </span><span className="text-accent font-semibold">{promptsReached}/7 levels passed</span></div>
          <p className="text-sm font-medium text-foreground pt-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-accent" />Definition pending</p>
          <div className="flex flex-wrap gap-1">{pending.map((f: any) => <Badge key={f.id} variant="outline">{f.name}</Badge>)}</div>
        </div>
      </div>
    </div>
  );
}
