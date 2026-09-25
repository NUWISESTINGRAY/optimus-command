import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronRight, Lock, ShieldAlert, X } from "lucide-react";
import { db, EntitySelect, useEntities } from "./shared";
import { toTaskPriority } from "./importPackage";

const STATUSES = ["proposed", "awaiting_approval", "approved", "rejected", "promoted", "in_progress", "blocked", "qa", "done", "cancelled"];
const PRIORITY_RISK: Record<string, string> = { P0: "critical", P1: "high", P2: "medium", P3: "low" };

export default function Backlog() {
  const { user } = useAuth();
  const { entities } = useEntities();
  const [batches, setBatches] = useState<any[]>([]);
  const [batch, setBatch] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState({ q: "", framework: "", phase: "", status: "" });
  const [newName, setNewName] = useState("");
  const [raw, setRaw] = useState("");

  const loadBatches = async () => {
    const { data } = await db.from("task_import_batches").select("*").order("created_at");
    setBatches(data ?? []);
    if (!batch && data?.length) loadItems(data.find((b: any) => b.package_version) ?? data[0]);
  };
  const loadItems = async (b: any) => {
    setBatch(b);
    const { data } = await db.from("task_import_items").select("*").eq("batch_id", b.id).order("sort_order").order("created_at");
    setItems(data ?? []);
  };
  useEffect(() => {
    loadBatches();
    db.from("jwba_agents").select("codename, display_name, spec").order("sort_order").then(({ data }: any) => setAgents(data ?? []));
  }, []);
  useEffect(() => {
    if (!batch) return;
    const ch = supabase.channel(`tii-${batch.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_import_items", filter: `batch_id=eq.${batch.id}` }, () => loadItems(batch))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [batch?.id]);

  const byExt = useMemo(() => Object.fromEntries(items.filter((i) => i.external_id).map((i) => [i.external_id, i])), [items]);
  const frameworks = [...new Set(items.map((i) => i.framework_ref).filter(Boolean))];
  const phases = [...new Set(items.map((i) => i.phase_days).filter(Boolean))];
  const shown = items.filter((i) =>
    (!f.q || `${i.external_id} ${i.title} ${i.owner_role}`.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.framework || i.framework_ref === f.framework) && (!f.phase || i.phase_days === f.phase) && (!f.status || i.status === f.status));

  const patch = async (id: string, p: any) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const { error } = await db.from("task_import_items").update(p).eq("id", id);
    if (error) toast.error(error.message);
  };
  const setKickoff = async (d: string) => {
    await db.from("task_import_batches").update({ kickoff_date: d || null }).eq("id", batch.id);
    setBatch({ ...batch, kickoff_date: d || null });
  };

  const gate = (i: any) => {
    const deps = (i.dependencies ?? []) as string[];
    const unmet = deps.filter((d) => !["promoted", "done", "in_progress", "qa"].includes(byExt[d]?.status));
    return [
      { ok: !!batch?.kickoff_date, label: "Kickoff date set on batch" },
      { ok: !!i.entity_id, label: "Entity / client assigned" },
      { ok: !!i.assignee_name?.trim(), label: "Named human assignee" },
      { ok: unmet.length === 0, label: unmet.length ? `Dependencies activated (waiting: ${unmet.join(", ")})` : "Dependencies activated" },
      { ok: ["approved"].includes(i.status), label: `Approved by ${i.approval_role ?? "approver"}` },
    ];
  };

  const requestApproval = async (i: any) => {
    const { data, error } = await supabase.from("approvals").insert({
      user_id: user!.id, title: `Activate ${i.external_id ?? ""} ${i.title}`.trim(),
      summary: `Approver role: ${i.approval_role ?? "—"} · Owner: ${i.owner_role ?? "—"} · Assignee: ${i.assignee_name ?? "—"}`,
      description: `Deliverable: ${i.deliverable ?? "—"}\nAcceptance: ${i.acceptance_criteria ?? "—"}`,
      risk_level: PRIORITY_RISK[i.priority] ?? "medium", status: "pending", source: "framework_os",
      source_type: "framework_task", source_id: i.id, payload_json: { external_id: i.external_id, batch_id: i.batch_id },
    }).select("id").single();
    if (error) return toast.error(error.message);
    await patch(i.id, { status: "awaiting_approval", approval_id: data.id });
    toast.success("Approval requested — see Approval Gate");
  };

  // Activation writes to the Mission Queue as "backlog": the auto-dispatch trigger only
  // fires for "todo", so activated tasks never run agents or send Telegram on their own.
  const activate = async (i: any) => {
    if (!gate(i).every((g) => g.ok)) return toast.error("Activation gate not satisfied");
    const due = i.due_offset_days != null ? format(addDays(new Date(batch.kickoff_date + "T00:00:00"), i.due_offset_days), "yyyy-MM-dd") : null;
    const ent = entities.find((e) => e.id === i.entity_id)?.name;
    const description = [
      `[${i.external_id}] ${i.framework_ref ?? ""} · Phase ${i.phase_days ?? "—"} · ${i.priority ?? ""}`,
      `Entity: ${ent ?? "—"} · Owner role: ${i.owner_role ?? "—"} · Approver: ${i.approval_role ?? "—"}`,
      i.assignee_agent ? `Support persona: ${i.assignee_agent}` : "",
      `Deliverable: ${i.deliverable ?? "—"}`, `Acceptance criteria: ${i.acceptance_criteria ?? "—"}`,
      i.dependencies?.length ? `Depends on: ${i.dependencies.join(", ")}` : "",
    ].filter(Boolean).join("\n");
    const { data: t, error } = await supabase.from("tasks").insert({
      user_id: user!.id, title: i.title, description, priority: toTaskPriority(i.priority),
      status: "backlog", due_date: due, assignee: i.assignee_name,
    }).select("id").single();
    if (error) return toast.error(error.message);
    await patch(i.id, { status: "promoted", promoted_task_id: t.id, actual_due_date: due });
    toast.success(`Activated to Mission Queue backlog (due ${due ?? "—"}); not dispatched`);
  };

  const addEvidence = async (i: any, url: string) => {
    if (!url.trim()) return;
    await patch(i.id, { evidence_links: [...(i.evidence_links ?? []), url.trim()] });
  };
  const markDone = async (i: any) => {
    if (!i.evidence_links?.length) return toast.error("A completed task requires proof — add an evidence link first");
    await patch(i.id, { status: "done", completed_at: new Date().toISOString() });
  };

  const stage = async () => {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const { data: b, error } = await db.from("task_import_batches").insert({ name: newName || `Import ${new Date().toLocaleString()}`, source: "paste" }).select().single();
    if (error) return toast.error(error.message);
    await db.from("task_import_items").insert(lines.map((l, idx) => {
      const [title, deliverable, priority, framework_ref] = l.split("|").map((s) => s?.trim() || null);
      return { batch_id: b.id, title, deliverable, priority, framework_ref, sort_order: idx };
    }));
    setRaw(""); setNewName(""); await loadBatches(); loadItems(b);
  };

  const counts = STATUSES.map((s) => [s, items.filter((i) => i.status === s).length] as const).filter(([, n]) => n);

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 flex gap-3 text-xs text-muted-foreground">
        <ShieldAlert className="w-5 h-5 text-accent shrink-0" />
        <div>
          <p className="text-foreground font-medium text-sm">Activation &amp; assignment gate</p>
          Imported tasks stay <b className="text-foreground">proposed and unassigned</b> here — they are never auto-dispatched and never trigger Telegram. To activate, set a kickoff date, entity, named human assignee, have dependencies activated, and get approval from the listed approver role. Activated tasks enter the Mission Queue as <b className="text-foreground">backlog</b>; agents only act if someone moves them to To Do.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="bg-secondary text-sm rounded-md px-2 h-9 border border-border" value={batch?.id ?? ""} onChange={(e) => loadItems(batches.find((b) => b.id === e.target.value))}>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {batch && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">Kickoff
            <Input type="date" className="w-[160px]" value={batch.kickoff_date ?? ""} onChange={(e) => setKickoff(e.target.value)} />
          </label>
        )}
        <Input placeholder="Search ID, title, role" className="w-[200px]" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        {[["framework", frameworks], ["phase", phases], ["status", STATUSES]].map(([k, opts]: any) => (
          <select key={k} className="bg-secondary text-xs rounded-md px-2 h-9 border border-border" value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
            <option value="">All {k}s</option>{opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>
      {batch?.instruction && <p className="text-xs text-muted-foreground">{batch.instruction}</p>}
      <div className="flex flex-wrap gap-2 text-xs">{counts.map(([s, n]) => <Badge key={s} variant="outline">{s.replace("_", " ")}: {n}</Badge>)}</div>

      <div className="glass-panel divide-y divide-border">
        {shown.map((i) => {
          const g = gate(i); const ready = g.every((x) => x.ok); const isOpen = open === i.id;
          const persona = agents.find((a) => a.codename === i.assignee_agent);
          return (
            <div key={i.id} className="p-3">
              <button className="w-full flex items-center gap-3 text-left" onClick={() => setOpen(isOpen ? null : i.id)}>
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className="text-[11px] font-mono text-primary w-12">{i.external_id ?? "—"}</span>
                <span className="text-sm text-foreground flex-1 truncate">{i.title}</span>
                <span className="hidden md:inline text-xs text-muted-foreground w-40 truncate">{i.owner_role}</span>
                <span className="hidden md:inline text-xs text-muted-foreground w-24">{i.framework_ref}</span>
                <Badge variant="outline" className="text-[10px]">{i.priority}</Badge>
                <span className="text-[10px] text-muted-foreground w-14 text-right">{i.due_offset_days != null ? `D+${i.due_offset_days}` : ""}</span>
                <Badge variant={i.status === "promoted" || i.status === "done" ? "default" : i.status === "approved" ? "secondary" : "outline"} className="w-28 justify-center">{i.status.replace("_", " ")}</Badge>
              </button>
              {isOpen && (
                <div className="mt-3 ml-7 grid xl:grid-cols-[1fr_320px] gap-4 text-xs">
                  <div className="space-y-2">
                    <dl className="grid grid-cols-[130px_1fr] gap-y-1">
                      <dt className="text-muted-foreground">Phase</dt><dd className="text-foreground">{i.phase_days ?? "—"}</dd>
                      <dt className="text-muted-foreground">Deliverable</dt><dd className="text-foreground">{i.deliverable ?? "—"}</dd>
                      <dt className="text-muted-foreground">Acceptance</dt><dd className="text-foreground">{i.acceptance_criteria ?? "—"}</dd>
                      <dt className="text-muted-foreground">Owner role</dt><dd className="text-foreground">{i.owner_role ?? "—"}</dd>
                      <dt className="text-muted-foreground">Approver role</dt><dd className="text-foreground">{i.approval_role ?? "—"}</dd>
                      <dt className="text-muted-foreground">Automation mode</dt><dd className="text-foreground">{i.automation_mode ?? "—"}</dd>
                      <dt className="text-muted-foreground">Dependencies</dt><dd className="text-foreground">{i.dependencies?.length ? i.dependencies.map((d: string) => `${d} (${byExt[d]?.status ?? "?"})`).join(", ") : "None"}</dd>
                      <dt className="text-muted-foreground">Due date</dt><dd className="text-foreground">{i.actual_due_date ?? (batch?.kickoff_date && i.due_offset_days != null ? `${format(addDays(new Date(batch.kickoff_date + "T00:00:00"), i.due_offset_days), "yyyy-MM-dd")} (projected)` : `D+${i.due_offset_days ?? "?"} from kickoff`)}</dd>
                    </dl>
                    <div className="grid md:grid-cols-3 gap-2 pt-2">
                      <EntitySelect value={i.entity_id} onChange={(v) => patch(i.id, { entity_id: v })} entities={entities} placeholder="No entity" />
                      <Input placeholder="Human assignee (name)" defaultValue={i.assignee_name ?? ""} onBlur={(e) => e.target.value !== (i.assignee_name ?? "") && patch(i.id, { assignee_name: e.target.value || null })} />
                      <select className="bg-secondary rounded-md px-2 h-10 border border-border" value={i.assignee_agent ?? ""} onChange={(e) => patch(i.id, { assignee_agent: e.target.value || null })}>
                        <option value="">No support persona</option>
                        {agents.map((a) => <option key={a.codename} value={a.codename}>{a.display_name} — {a.spec?.role}</option>)}
                      </select>
                    </div>
                    {persona && <p className="text-muted-foreground">Support persona drafts only ({i.automation_mode}); {i.assignee_name || "the human assignee"} stays accountable.</p>}
                    <div className="space-y-1 pt-2">
                      <p className="text-muted-foreground">Evidence links</p>
                      {(i.evidence_links ?? []).map((l: string, n: number) => (
                        <div key={n} className="flex items-center gap-2">
                          <a href={l} target="_blank" rel="noreferrer" className="text-primary truncate flex-1">{l}</a>
                          <button onClick={() => patch(i.id, { evidence_links: i.evidence_links.filter((_: any, k: number) => k !== n) })}><X className="w-3 h-3 text-muted-foreground" /></button>
                        </div>
                      ))}
                      <Input placeholder="Paste evidence URL and press Enter" onKeyDown={(e) => { if (e.key === "Enter") { addEvidence(i, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; } }} />
                    </div>
                  </div>
                  <div className="border border-border rounded-md p-3 space-y-2">
                    <p className="font-medium text-foreground flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Activation gate</p>
                    {g.map((x) => (
                      <div key={x.label} className="flex items-start gap-2">
                        {x.ok ? <Check className="w-3.5 h-3.5 text-primary mt-0.5" /> : <X className="w-3.5 h-3.5 text-destructive mt-0.5" />}
                        <span className={x.ok ? "text-foreground" : "text-muted-foreground"}>{x.label}</span>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {["proposed", "rejected"].includes(i.status) && <Button size="sm" variant="outline" onClick={() => requestApproval(i)}>Request approval</Button>}
                      {i.status === "awaiting_approval" && <span className="text-muted-foreground">Waiting in Approval Gate / Telegram…</span>}
                      {i.status !== "promoted" && i.status !== "done" && <Button size="sm" disabled={!ready} onClick={() => activate(i)}>Activate</Button>}
                      {i.status === "promoted" && <Button size="sm" variant="outline" onClick={() => markDone(i)}>Mark done (needs evidence)</Button>}
                      {i.status === "proposed" && <Button size="sm" variant="ghost" onClick={() => patch(i.id, { status: "cancelled" })}>Cancel</Button>}
                    </div>
                    {i.completed_at && <p className="text-muted-foreground">Completed {new Date(i.completed_at).toLocaleString()}</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!shown.length && <p className="p-4 text-sm text-muted-foreground">No tasks. Import the package from the Dashboard tab.</p>}
      </div>

      <details className="glass-panel p-4">
        <summary className="text-sm text-foreground cursor-pointer">Stage another batch (paste)</summary>
        <div className="space-y-2 mt-3">
          <Input placeholder="Batch name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Textarea className="min-h-[120px] font-mono text-xs" placeholder={"One task per line\nTitle | deliverable | priority | framework"} value={raw} onChange={(e) => setRaw(e.target.value)} />
          <Button onClick={stage}>Stage as proposed</Button>
        </div>
      </details>
    </div>
  );
}
