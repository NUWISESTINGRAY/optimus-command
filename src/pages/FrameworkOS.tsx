import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, History, Plus, ShieldAlert } from "lucide-react";

const db = supabase as any;

// Letter keys only — full labels will be supplied with the official JW Brand content.
const PULSE = ["P", "U", "L", "S", "E"];
const PROMPTS = ["P", "R", "O", "M", "P2", "T", "S"];
const letter = (k: string) => k.replace(/\d+$/, "");

/* ---------------- Library ---------------- */
function Library() {
  const [kind, setKind] = useState<"framework" | "sop">("framework");
  const [items, setItems] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [newName, setNewName] = useState("");
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await db.from("frameworks").select("*").eq("kind", kind).eq("archived", false).order("name");
    setItems(data ?? []);
  };
  const loadVersions = async (f: any) => {
    setSel(f);
    const { data } = await db.from("framework_versions").select("*").eq("framework_id", f.id).order("version", { ascending: false });
    setVersions(data ?? []);
    const cur = (data ?? []).find((v: any) => v.is_current);
    setDraft(cur?.content ?? "");
    setNotes("");
  };
  useEffect(() => { setSel(null); load(); }, [kind]);

  const create = async () => {
    if (!newName.trim()) return;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data, error } = await db.from("frameworks").insert({ kind, name: newName.trim(), slug }).select().single();
    if (error) return toast.error(error.message);
    await db.from("framework_versions").insert({ framework_id: data.id, version: 1, content: "", change_notes: "Created" });
    setNewName(""); await load(); loadVersions(data);
  };
  const saveVersion = async () => {
    const next = (versions[0]?.version ?? 0) + 1;
    const { error } = await db.from("framework_versions").insert({ framework_id: sel.id, version: next, content: draft, change_notes: notes || null });
    if (error) return toast.error(error.message);
    toast.success(`Saved v${next}`); loadVersions(sel);
  };
  const restore = async (v: any) => {
    await db.from("framework_versions").update({ is_current: true }).eq("id", v.id);
    toast.success(`v${v.version} is now current`); loadVersions(sel);
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-4">
      <div className="glass-panel p-4 space-y-3">
        <div className="flex gap-2">
          <Button size="sm" variant={kind === "framework" ? "default" : "outline"} onClick={() => setKind("framework")}>Frameworks</Button>
          <Button size="sm" variant={kind === "sop" ? "default" : "outline"} onClick={() => setKind("sop")}>SOPs</Button>
        </div>
        <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="space-y-1 max-h-[480px] overflow-auto">
          {filtered.map((f) => (
            <button key={f.id} onClick={() => loadVersions(f)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${sel?.id === f.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"}`}>
              {f.name}
            </button>
          ))}
          {!filtered.length && <p className="text-xs text-muted-foreground px-1">Nothing here yet.</p>}
        </div>
        <div className="flex gap-2 pt-2 border-t border-border">
          <Input placeholder={`New ${kind === "sop" ? "SOP" : "framework"}`} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button size="icon" onClick={create}><Plus className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="glass-panel p-4">
        {!sel ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm gap-2">
            <BookOpen className="w-6 h-6" /> Select or create an entry.
          </div>
        ) : (
          <div className="grid xl:grid-cols-[1fr_220px] gap-4">
            <div className="space-y-3">
              <h2 className="font-display font-semibold text-foreground">{sel.name}</h2>
              <Textarea className="min-h-[360px] font-mono text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="flex gap-2">
                <Input placeholder="What changed?" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <Button onClick={saveVersion}>Save new version</Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><History className="w-3 h-3" /> Versions</p>
              {versions.map((v) => (
                <div key={v.id} className="border border-border rounded-md p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">v{v.version}</span>
                    {v.is_current ? <Badge>current</Badge> : <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => restore(v)}>Make current</Button>}
                  </div>
                  <p className="text-muted-foreground">{v.change_notes || "—"}</p>
                  <p className="text-muted-foreground/70">{new Date(v.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- P.U.L.S.E. ---------------- */
function Pulse() {
  const [rows, setRows] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(PULSE.map((k) => [k, 3])));
  const [notes, setNotes] = useState("");
  const load = async () => {
    const { data } = await db.from("pulse_assessments").select("*").order("assessed_at", { ascending: false }).limit(20);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    const { error } = await db.from("pulse_assessments").insert({ scores, notes: notes || null });
    if (error) return toast.error(error.message);
    toast.success("Assessment saved"); setNotes(""); load();
  };
  const avg = (s: any) => (PULSE.reduce((a, k) => a + (Number(s?.[k]) || 0), 0) / PULSE.length).toFixed(1);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-panel p-4 space-y-4">
        <h2 className="font-display font-semibold text-foreground">New P.U.L.S.E. assessment</h2>
        {PULSE.map((k) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-md bg-primary/15 text-primary font-bold flex items-center justify-center">{k}</span>
            <input type="range" min={0} max={5} value={scores[k]} onChange={(e) => setScores({ ...scores, [k]: Number(e.target.value) })} className="flex-1 accent-primary" />
            <span className="w-6 text-right text-sm text-foreground">{scores[k]}</span>
          </div>
        ))}
        <Textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={save}>Save assessment</Button>
      </div>
      <div className="glass-panel p-4 space-y-2">
        <h2 className="font-display font-semibold text-foreground">History</h2>
        {rows.map((r) => (
          <div key={r.id} className="border border-border rounded-md p-3 text-xs">
            <div className="flex justify-between mb-2"><span className="text-muted-foreground">{new Date(r.assessed_at).toLocaleDateString()}</span><span className="text-accent font-semibold">avg {avg(r.scores)}</span></div>
            <div className="flex gap-2">
              {PULSE.map((k) => (
                <div key={k} className="flex-1 text-center">
                  <div className="h-12 bg-secondary rounded flex items-end overflow-hidden"><div className="w-full bg-primary/70" style={{ height: `${(Number(r.scores?.[k]) || 0) * 20}%` }} /></div>
                  <span className="text-muted-foreground">{k}</span>
                </div>
              ))}
            </div>
            {r.notes && <p className="mt-2 text-muted-foreground">{r.notes}</p>}
          </div>
        ))}
        {!rows.length && <p className="text-xs text-muted-foreground">No assessments yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- PROMPTS maturity ---------------- */
function Prompts() {
  const [rows, setRows] = useState<Record<string, any>>({});
  const load = async () => {
    const { data } = await db.from("prompts_maturity").select("*");
    setRows(Object.fromEntries((data ?? []).map((r: any) => [r.dimension, r])));
  };
  useEffect(() => { load(); }, []);
  const set = async (dimension: string, patch: any) => {
    const cur = rows[dimension] ?? { dimension, level: 0, notes: "" };
    const next = { ...cur, ...patch };
    setRows({ ...rows, [dimension]: next });
    const { error } = await db.from("prompts_maturity").upsert({ dimension, level: next.level, notes: next.notes }, { onConflict: "user_id,dimension" });
    if (error) toast.error(error.message);
  };
  const overall = useMemo(() => (PROMPTS.reduce((a, k) => a + (rows[k]?.level ?? 0), 0) / PROMPTS.length).toFixed(1), [rows]);

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-display font-semibold text-foreground">PROMPTS maturity</h2>
        <span className="text-sm text-accent font-semibold">Overall {overall} / 5</span>
      </div>
      {PROMPTS.map((k) => {
        const lvl = rows[k]?.level ?? 0;
        return (
          <div key={k} className="grid md:grid-cols-[40px_220px_1fr] gap-3 items-center">
            <span className="w-8 h-8 rounded-md bg-primary/15 text-primary font-bold flex items-center justify-center">{letter(k)}</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => set(k, { level: n })}
                  className={`w-8 h-8 rounded text-xs ${n <= lvl && lvl > 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{n}</button>
              ))}
            </div>
            <Input placeholder="Notes / evidence" defaultValue={rows[k]?.notes ?? ""} key={rows[k]?.id ?? k} onBlur={(e) => set(k, { notes: e.target.value })} />
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Task import staging ---------------- */
function TaskImport() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [batch, setBatch] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");

  const loadBatches = async () => {
    const { data } = await db.from("task_import_batches").select("*").order("created_at", { ascending: false });
    setBatches(data ?? []);
  };
  const loadItems = async (b: any) => {
    setBatch(b);
    const { data } = await db.from("task_import_items").select("*").eq("batch_id", b.id).order("created_at");
    setItems(data ?? []);
  };
  useEffect(() => { loadBatches(); }, []);

  // One task per line. Optional: "Title | description | priority | framework"
  const stage = async () => {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return toast.error("Paste at least one task");
    const { data: b, error } = await db.from("task_import_batches").insert({ name: name || `Import ${new Date().toLocaleString()}`, source: "paste" }).select().single();
    if (error) return toast.error(error.message);
    const rows = lines.map((l) => {
      const [title, description, priority, framework_ref] = l.split("|").map((s) => s?.trim() || null);
      return { batch_id: b.id, title, description, priority, framework_ref };
    });
    const { error: e2 } = await db.from("task_import_items").insert(rows);
    if (e2) return toast.error(e2.message);
    toast.success(`${rows.length} tasks staged as proposed`);
    setRaw(""); setName(""); await loadBatches(); loadItems(b);
  };

  const setStatus = async (ids: string[], status: string) => {
    await db.from("task_import_items").update({ status }).in("id", ids);
    loadItems(batch);
  };

  // Promotion writes to the Mission Queue with status "backlog" — the auto-dispatch
  // trigger only fires on "todo", so promoted tasks never run agents automatically.
  const promote = async () => {
    const approved = items.filter((i) => i.status === "approved");
    if (!approved.length) return toast.error("Approve items first");
    for (const i of approved) {
      const { data: t, error } = await supabase.from("tasks").insert({
        user_id: user!.id, title: i.title, description: i.description, priority: i.priority ?? "medium", status: "backlog",
      }).select("id").single();
      if (error) { toast.error(error.message); break; }
      await db.from("task_import_items").update({ status: "promoted", promoted_task_id: t.id }).eq("id", i.id);
    }
    toast.success("Promoted to Mission Queue backlog (not dispatched)");
    loadItems(batch);
  };

  const color: Record<string, string> = { proposed: "secondary", approved: "default", rejected: "destructive", promoted: "outline" };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="w-4 h-4 text-accent" />
        Staged tasks are held here as <b className="text-foreground">proposed</b> and never reach agents. Promoted tasks land in backlog and only run when you move them to To Do.
      </div>
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <div className="glass-panel p-4 space-y-3">
          <Input placeholder="Batch name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea className="min-h-[160px] text-xs font-mono" placeholder={"One task per line\nTitle | description | priority | framework"} value={raw} onChange={(e) => setRaw(e.target.value)} />
          <Button className="w-full" onClick={stage}>Stage as proposed</Button>
          <div className="pt-2 border-t border-border space-y-1">
            {batches.map((b) => (
              <button key={b.id} onClick={() => loadItems(b)} className={`w-full text-left px-3 py-2 rounded-md text-sm ${batch?.id === b.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"}`}>{b.name}</button>
            ))}
          </div>
        </div>
        <div className="glass-panel p-4 space-y-3">
          {!batch ? <p className="text-sm text-muted-foreground">Select a batch.</p> : (
            <>
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <h2 className="font-display font-semibold text-foreground">{batch.name}</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setStatus(items.filter((i) => i.status === "proposed").map((i) => i.id), "approved")}>Approve all proposed</Button>
                  <Button size="sm" onClick={promote}>Promote approved</Button>
                </div>
              </div>
              {items.map((i) => (
                <div key={i.id} className="border border-border rounded-md p-3 flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <p className="text-foreground font-medium">{i.title}</p>
                    {i.description && <p className="text-xs text-muted-foreground">{i.description}</p>}
                    <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">{i.priority && <span>{i.priority}</span>}{i.framework_ref && <span>· {i.framework_ref}</span>}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={color[i.status] as any}>{i.status}</Badge>
                    {i.status !== "promoted" && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStatus([i.id], "approved")}>Approve</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setStatus([i.id], "rejected")}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FrameworkOS() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">JW Brand Framework OS</h1>
        <p className="text-sm text-muted-foreground mt-1">Versioned frameworks & SOPs, P.U.L.S.E. assessments, PROMPTS maturity, and safe task import.</p>
      </div>
      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Frameworks & SOPs</TabsTrigger>
          <TabsTrigger value="pulse">P.U.L.S.E.</TabsTrigger>
          <TabsTrigger value="prompts">PROMPTS</TabsTrigger>
          <TabsTrigger value="import">Task Import</TabsTrigger>
        </TabsList>
        <TabsContent value="library"><Library /></TabsContent>
        <TabsContent value="pulse"><Pulse /></TabsContent>
        <TabsContent value="prompts"><Prompts /></TabsContent>
        <TabsContent value="import"><TaskImport /></TabsContent>
      </Tabs>
    </div>
  );
}
