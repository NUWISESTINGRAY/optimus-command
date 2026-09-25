import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, BookOpen, History, Pencil, Eye } from "lucide-react";
import { db, Markdown, STATUS_LABEL } from "./shared";

const KINDS = [
  { k: "manual", label: "Operating Manual" },
  { k: "sop", label: "SOPs" },
  { k: "framework", label: "Framework Registry" },
  { k: "spec", label: "Agent & Workflow Specs" },
] as const;

export default function Library() {
  const [kind, setKind] = useState<string>("manual");
  const [items, setItems] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await db.from("frameworks").select("*").eq("kind", kind).eq("archived", false).order("sort_order").order("name");
    setItems(data ?? []);
    if (data?.length) open(data[0]); else setSel(null);
  };
  const open = async (f: any) => {
    setSel(f); setEditing(false);
    const { data } = await db.from("framework_versions").select("*").eq("framework_id", f.id).order("version", { ascending: false });
    setVersions(data ?? []);
    const cur = (data ?? []).find((v: any) => v.is_current) ?? data?.[0];
    setViewing(cur ?? null); setDraft(cur?.content ?? ""); setNotes("");
  };
  useEffect(() => { load(); }, [kind]);

  const saveVersion = async () => {
    const next = (versions[0]?.version ?? 0) + 1;
    const { error } = await db.from("framework_versions").insert({ framework_id: sel.id, version: next, content: draft, change_notes: notes || null });
    if (error) return toast.error(error.message);
    toast.success(`Saved v${next} as current`); open(sel);
  };
  const setStatus = async (status: string) => {
    await db.from("frameworks").update({ status }).eq("id", sel.id);
    const f = { ...sel, status }; setSel(f); setItems(items.map((i) => (i.id === f.id ? f : i)));
  };
  const makeCurrent = async (v: any) => {
    await db.from("framework_versions").update({ is_current: true }).eq("id", v.id);
    toast.success(`v${v.version} is now current`); open(sel);
  };

  const filtered = items.filter((i) => `${i.code ?? ""} ${i.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Button key={k.k} size="sm" variant={kind === k.k ? "default" : "outline"} onClick={() => setKind(k.k)}>{k.label}</Button>
        ))}
      </div>
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <div className="glass-panel p-3 space-y-2">
          <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="space-y-1 max-h-[70vh] overflow-auto">
            {filtered.map((f) => (
              <button key={f.id} onClick={() => open(f)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${sel?.id === f.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{f.name}</span>
                  {f.status === "definition_pending" && <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0" />}
                </div>
                {f.code && <span className="text-[10px] uppercase tracking-wider opacity-70">{f.code}</span>}
              </button>
            ))}
            {!filtered.length && <p className="text-xs text-muted-foreground p-2">Nothing here yet. Import the package from the Dashboard tab.</p>}
          </div>
        </div>

        <div className="glass-panel p-5 min-w-0">
          {!sel ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm gap-2"><BookOpen className="w-6 h-6" />Select an entry.</div>
          ) : (
            <div className="grid xl:grid-cols-[1fr_230px] gap-5">
              <div className="space-y-4 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">{sel.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant={sel.status === "definition_pending" ? "destructive" : "secondary"}>{STATUS_LABEL[sel.status] ?? sel.status}</Badge>
                      {sel.layer && <span>Layer: {sel.layer}</span>}
                      {sel.owner_role && <span>Owner: {sel.owner_role}</span>}
                      {viewing && <span>Viewing v{viewing.version}{viewing.is_current ? " (current)" : ""}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {sel.kind === "framework" && (
                      <select className="bg-secondary text-xs rounded-md px-2 border border-border" value={sel.status} onChange={(e) => setStatus(e.target.value)}>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
                      {editing ? <><Eye className="w-3.5 h-3.5 mr-1" />View</> : <><Pencil className="w-3.5 h-3.5 mr-1" />Edit</>}
                    </Button>
                  </div>
                </div>
                {sel.status === "definition_pending" && (
                  <div className="border border-accent/40 bg-accent/10 rounded-md p-3 text-xs text-foreground">
                    Definition pending — agents must not improvise this method. Recover the source and get owner approval before publishing.
                  </div>
                )}
                {editing ? (
                  <div className="space-y-2">
                    <Textarea className="min-h-[55vh] font-mono text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <div className="flex gap-2">
                      <Input placeholder="What changed? (required for audit)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                      <Button onClick={saveVersion} disabled={!notes.trim()}>Save new version</Button>
                    </div>
                  </div>
                ) : (
                  <Markdown>{viewing?.content || "_No content yet._"}</Markdown>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><History className="w-3 h-3" /> Versions</p>
                {versions.map((v) => (
                  <div key={v.id} className={`border rounded-md p-2 text-xs space-y-1 cursor-pointer ${viewing?.id === v.id ? "border-primary/50" : "border-border"}`}
                    onClick={() => { setViewing(v); setEditing(false); }}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">v{v.version}</span>
                      {v.is_current ? <Badge>current</Badge> : (
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={(e) => { e.stopPropagation(); makeCurrent(v); }}>Make current</Button>
                      )}
                    </div>
                    <p className="text-muted-foreground">{v.change_notes || "—"}</p>
                    <p className="text-muted-foreground/70">{new Date(v.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {sel.source_ref && <p className="text-[10px] text-muted-foreground pt-2">Source: {sel.source_ref}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
