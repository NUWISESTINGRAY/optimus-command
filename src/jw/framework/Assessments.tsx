import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db, EntitySelect, useEntities } from "./shared";
import { PULSE_PILLARS, PROMPTS_LEVELS } from "./importPackage";

export function Pulse() {
  const { entities } = useEntities();
  const [entity, setEntity] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(PULSE_PILLARS.map((p) => [p.key, 3])));
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");

  const load = async () => {
    let q = db.from("pulse_assessments").select("*").order("assessed_at", { ascending: false }).limit(30);
    q = entity ? q.eq("entity_id", entity) : q.is("entity_id", null);
    const { data } = await q; setRows(data ?? []);
  };
  useEffect(() => { load(); }, [entity]);

  const save = async () => {
    const evidence_links = evidence.split(/\s+/).filter(Boolean);
    const { error } = await db.from("pulse_assessments").insert({
      scores, notes: notes || null, entity_id: entity, evidence_links,
      subject: entities.find((e) => e.id === entity)?.name ?? "Portfolio",
    });
    if (error) return toast.error(error.message);
    toast.success("Assessment saved"); setNotes(""); setEvidence(""); load();
  };
  const avg = (s: any) => (PULSE_PILLARS.reduce((a, p) => a + (Number(s?.[p.key]) || 0), 0) / PULSE_PILLARS.length).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Scope</span><EntitySelect value={entity} onChange={setEntity} entities={entities} /></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-foreground">New P.U.L.S.E. assessment</h2>
            <p className="text-xs text-muted-foreground mt-1">SOP 02: score 1–5 on existence, adoption, consistency, effectiveness and resilience. Interviews alone cannot support a high score; score missing evidence conservatively.</p>
          </div>
          {PULSE_PILLARS.map((p) => (
            <div key={p.key} className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-md bg-primary/15 text-primary font-bold flex items-center justify-center">{p.key}</span>
                <span className="text-sm text-foreground flex-1">{p.label}</span>
                <span className="w-6 text-right text-sm text-foreground">{scores[p.key]}</span>
              </div>
              <input type="range" min={1} max={5} value={scores[p.key]} onChange={(e) => setScores({ ...scores, [p.key]: Number(e.target.value) })} className="w-full accent-primary" />
            </div>
          ))}
          <Textarea placeholder="Evidence summary, limitations, critical findings" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Input placeholder="Evidence links (space-separated URLs)" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
          <Button onClick={save}>Save assessment</Button>
        </div>
        <div className="glass-panel p-5 space-y-2">
          <h2 className="font-display font-semibold text-foreground">History</h2>
          {rows.map((r) => (
            <div key={r.id} className="border border-border rounded-md p-3 text-xs">
              <div className="flex justify-between mb-2"><span className="text-muted-foreground">{new Date(r.assessed_at).toLocaleDateString()} · {r.subject}</span><span className="text-accent font-semibold">avg {avg(r.scores)}</span></div>
              <div className="flex gap-2">
                {PULSE_PILLARS.map((p) => (
                  <div key={p.key} className="flex-1 text-center" title={p.label}>
                    <div className="h-12 bg-secondary rounded flex items-end overflow-hidden"><div className="w-full bg-primary/70" style={{ height: `${(Number(r.scores?.[p.key]) || 0) * 20}%` }} /></div>
                    <span className="text-muted-foreground">{p.key} {r.scores?.[p.key]}</span>
                  </div>
                ))}
              </div>
              {r.notes && <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{r.notes}</p>}
              {r.evidence_links?.map((l: string) => <a key={l} href={l} target="_blank" rel="noreferrer" className="block text-primary truncate">{l}</a>)}
            </div>
          ))}
          {!rows.length && <p className="text-xs text-muted-foreground">No assessments for this scope yet.</p>}
        </div>
      </div>
    </div>
  );
}

export function Prompts() {
  const { entities } = useEntities();
  const [entity, setEntity] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, any>>({});
  const load = async () => {
    let q = db.from("prompts_maturity").select("*");
    q = entity ? q.eq("entity_id", entity) : q.is("entity_id", null);
    const { data } = await q;
    setRows(Object.fromEntries((data ?? []).map((r: any) => [r.dimension, r])));
  };
  useEffect(() => { load(); }, [entity]);

  const set = async (dimension: string, patch: any) => {
    const cur = rows[dimension];
    const next = { ...(cur ?? { dimension, level: 0, notes: "" }), ...patch };
    setRows({ ...rows, [dimension]: next });
    const res = cur?.id
      ? await db.from("prompts_maturity").update({ level: next.level, notes: next.notes }).eq("id", cur.id).select().single()
      : await db.from("prompts_maturity").insert({ dimension, level: next.level, notes: next.notes, entity_id: entity }).select().single();
    if (res.error) return toast.error(res.error.message);
    setRows((r) => ({ ...r, [dimension]: res.data }));
  };
  // Highest level whose gate is passed (level >= 3) consecutively from the start
  const reached = useMemo(() => {
    let n = 0;
    for (const l of PROMPTS_LEVELS) { if ((rows[l.key]?.level ?? 0) >= 3) n++; else break; }
    return n;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Scope</span><EntitySelect value={entity} onChange={setEntity} entities={entities} /></div>
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h2 className="font-display font-semibold text-foreground">PROMPTS maturity</h2>
            <p className="text-xs text-muted-foreground">SOP 07: rate readiness 0–5 per level. A level counts as passed at 3+ with its level-gate dossier.</p>
          </div>
          <span className="text-sm text-accent font-semibold">Levels passed: {reached} / 7{reached ? ` — ${PROMPTS_LEVELS[reached - 1].label}` : ""}</span>
        </div>
        <div className="flex gap-1">
          {PROMPTS_LEVELS.map((l, i) => (
            <div key={l.key} className={`flex-1 h-2 rounded ${i < reached ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
        {PROMPTS_LEVELS.map((l, i) => {
          const lvl = rows[l.key]?.level ?? 0;
          return (
            <div key={l.key} className="grid md:grid-cols-[180px_230px_1fr] gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-md bg-primary/15 text-primary font-bold flex items-center justify-center">{l.key.replace(/\d/, "")}</span>
                <span className="text-sm text-foreground">{i + 1}. {l.label}</span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => set(l.key, { level: n })}
                    className={`w-8 h-8 rounded text-xs ${n <= lvl && lvl > 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{n}</button>
                ))}
              </div>
              <Input placeholder="Gate dossier / evidence link" defaultValue={rows[l.key]?.notes ?? ""} key={`${entity}-${rows[l.key]?.id ?? l.key}`} onBlur={(e) => e.target.value !== (rows[l.key]?.notes ?? "") && set(l.key, { notes: e.target.value })} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
