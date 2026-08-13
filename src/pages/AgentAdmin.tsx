import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import { Plus, Search, ShieldAlert, Trash2, Pencil, Power } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AgentSpec {
  role?: string;
  tagline?: string;
  slash?: string;
  expertise?: string[];
  responsibilities?: string[];
  collaborates_with?: string[];
  voice_id?: string;
  voice_name?: string;
  [k: string]: unknown;
}

interface Agent {
  codename: string;
  display_name: string;
  color: string;
  status: string;
  telegram_command: string | null;
  sort_order: number;
  default_mode: string | null;
  spec: AgentSpec;
}

const emptyForm = {
  codename: "",
  display_name: "",
  color: "cyan",
  status: "idle",
  telegram_command: "",
  sort_order: 99,
  default_mode: "",
  role: "",
  tagline: "",
  slash: "",
  expertise: "",
  responsibilities: "",
  collaborates_with: "",
  voice_id: "",
  voice_name: "",
};

type FormState = typeof emptyForm;

const toList = (s: string) =>
  s.split(",").map((v) => v.trim()).filter(Boolean);

function agentToForm(a: Agent): FormState {
  return {
    codename: a.codename,
    display_name: a.display_name,
    color: a.color ?? "cyan",
    status: a.status ?? "idle",
    telegram_command: a.telegram_command ?? "",
    sort_order: a.sort_order ?? 99,
    default_mode: a.default_mode ?? "",
    role: a.spec?.role ?? "",
    tagline: a.spec?.tagline ?? "",
    slash: a.spec?.slash ?? "",
    expertise: (a.spec?.expertise ?? []).join(", "),
    responsibilities: (a.spec?.responsibilities ?? []).join(", "),
    collaborates_with: (a.spec?.collaborates_with ?? []).join(", "),
    voice_id: a.spec?.voice_id ?? "",
    voice_name: a.spec?.voice_name ?? "",
  };
}

export default function AgentAdmin() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("jwba_agents").select("*").order("sort_order");
    if (error) toast.error(error.message);
    setAgents(((data ?? []) as unknown) as Agent[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.codename.includes(q) ||
        a.display_name.toLowerCase().includes(q) ||
        (a.default_mode ?? "").toLowerCase().includes(q) ||
        (a.spec?.role ?? "").toLowerCase().includes(q),
    );
  }, [agents, query]);

  const set = (k: keyof FormState, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: (agents.at(-1)?.sort_order ?? 0) + 1 });
    setOpen(true);
  };

  const openEdit = (a: Agent) => {
    setEditing(a);
    setForm(agentToForm(a));
    setOpen(true);
  };

  const save = async () => {
    const codename = form.codename.trim().toLowerCase();
    if (!codename || !form.display_name.trim()) {
      toast.error("Codename and display name are required");
      return;
    }
    setSaving(true);
    const spec: AgentSpec = {
      ...(editing?.spec ?? {}),
      role: form.role.trim(),
      tagline: form.tagline.trim(),
      slash: form.slash.trim() || `/${codename}`,
      expertise: toList(form.expertise),
      responsibilities: toList(form.responsibilities),
      collaborates_with: toList(form.collaborates_with),
      voice_id: form.voice_id.trim(),
      voice_name: form.voice_name.trim(),
    };
    const row = {
      codename,
      display_name: form.display_name.trim(),
      color: form.color.trim() || "cyan",
      status: form.status,
      telegram_command: form.telegram_command.trim() || `/${codename}`,
      sort_order: Number(form.sort_order) || 99,
      default_mode: form.default_mode.trim() || null,
      spec: spec as never,
    };

    const { error } = editing
      ? await supabase.from("jwba_agents").update(row).eq("codename", editing.codename)
      : await supabase.from("jwba_agents").insert(row);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? `${row.display_name} updated` : `${row.display_name} added`);
    setOpen(false);
    load();
  };

  const toggleDisabled = async (a: Agent) => {
    const next = a.status === "disabled" ? "idle" : "disabled";
    const { error } = await supabase.from("jwba_agents").update({ status: next }).eq("codename", a.codename);
    if (error) return toast.error(error.message);
    toast.success(`${a.display_name} ${next === "disabled" ? "disabled" : "enabled"}`);
    load();
  };

  const remove = async (a: Agent) => {
    const { error } = await supabase.from("jwba_agents").delete().eq("codename", a.codename);
    setDeleteTarget(null);
    if (error) return toast.error(error.message);
    toast.success(`${a.display_name} removed`);
    load();
  };

  if (adminLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto" />
        <h1 className="text-lg font-display font-bold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          Your account doesn't have the admin role, so persona management is read-only.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Persona Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit, disable, and remove AI agent personas — no SQL required.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> New persona
        </Button>
      </div>

      <div className="flex items-center gap-2 glass-panel px-4 py-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search personas by codename, name, role, or mode…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <span className="text-xs font-mono text-muted-foreground">{filtered.length}</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading roster…</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div
              key={a.codename}
              className={`glass-panel p-4 space-y-3 ${a.status === "disabled" ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">{a.display_name}</h3>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {a.codename} · {a.spec?.role || "—"}
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                  {a.status}
                </span>
              </div>
              <p className="text-xs text-foreground/70 line-clamp-2">{a.spec?.tagline}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground">
                <span className="truncate">mode: {a.default_mode || "—"}</span>
                <span className="truncate">order: {a.sort_order}</span>
                <span className="truncate col-span-2">voice: {a.spec?.voice_name || a.spec?.voice_id || "—"}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="secondary" className="gap-1" onClick={() => openEdit(a)}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => toggleDisabled(a)}>
                  <Power className="w-3 h-3" /> {a.status === "disabled" ? "Enable" : "Disable"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 ml-auto text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(a)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.display_name}` : "New persona"}</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Codename</Label>
              <Input
                value={form.codename}
                disabled={!!editing}
                onChange={(e) => set("codename", e.target.value)}
                placeholder="optimus"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="CFO" />
            </div>
            <div className="space-y-1.5">
              <Label>Default mode</Label>
              <Input
                value={form.default_mode}
                onChange={(e) => set("default_mode", e.target.value)}
                placeholder="CFO"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tagline</Label>
              <Textarea rows={2} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Expertise (comma separated)</Label>
              <Input value={form.expertise} onChange={(e) => set("expertise", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Responsibilities (comma separated)</Label>
              <Input value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Collaborates with (codenames, comma separated)</Label>
              <Input value={form.collaborates_with} onChange={(e) => set("collaborates_with", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Voice ID (ElevenLabs)</Label>
              <Input value={form.voice_id} onChange={(e) => set("voice_id", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Voice name</Label>
              <Input value={form.voice_name} onChange={(e) => set("voice_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telegram command</Label>
              <Input
                value={form.telegram_command}
                onChange={(e) => set("telegram_command", e.target.value)}
                placeholder="/optimus"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slash command (chat)</Label>
              <Input value={form.slash} onChange={(e) => set("slash", e.target.value)} placeholder="/optimus" />
            </div>
            <div className="space-y-1.5">
              <Label>Color token</Label>
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="cyan" />
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                checked={form.status !== "disabled"}
                onCheckedChange={(v) => set("status", v ? "idle" : "disabled")}
              />
              <Label className="cursor-pointer">Active (available to the team)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create persona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the persona. If it has produced work, disable it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && remove(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
