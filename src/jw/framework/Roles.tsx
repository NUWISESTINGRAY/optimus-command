import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { db } from "./shared";
import { agentAvatar } from "@/jwba/lib/agentAvatars";

export default function Roles() {
  const [rows, setRows] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  useEffect(() => {
    db.from("jw_role_mappings").select("*").order("role_kind").order("role_name").then(({ data }: any) => setRows(data ?? []));
    db.from("jwba_agents").select("codename, display_name, spec, status").order("sort_order").then(({ data }: any) => setAgents(data ?? []));
  }, []);
  const remap = async (r: any, code: string) => {
    const { error } = await db.from("jw_role_mappings").update({ mapped_codename: code || null }).eq("id", r.id);
    if (error) return toast.error(error.message);
    setRows(rows.map((x) => (x.id === r.id ? { ...x, mapped_codename: code || null } : x)));
  };
  const section = (kind: string, title: string, note: string) => (
    <div className="glass-panel p-5 space-y-3">
      <div><h2 className="font-display font-semibold text-foreground">{title}</h2><p className="text-xs text-muted-foreground">{note}</p></div>
      <div className="grid md:grid-cols-2 gap-3">
        {rows.filter((r) => r.role_kind === kind).map((r) => {
          const a = agents.find((x) => x.codename === r.mapped_codename);
          return (
            <div key={r.id} className="border border-border rounded-md p-3 text-xs space-y-2">
              <div className="flex items-center gap-3">
                {a ? <img src={agentAvatar(a.codename)} alt={a.display_name} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-secondary" />}
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">{r.role_name}</p>
                  <p className="text-muted-foreground">{a ? `${a.display_name} · ${a.spec?.role ?? ""}` : "Unmapped"}</p>
                </div>
                <select className="bg-secondary rounded-md px-2 h-8 border border-border" value={r.mapped_codename ?? ""} onChange={(e) => remap(r, e.target.value)}>
                  <option value="">—</option>
                  {agents.map((x) => <option key={x.codename} value={x.codename}>{x.display_name}</option>)}
                </select>
              </div>
              {r.mission && <p className="text-foreground">{r.mission}</p>}
              {r.inputs && <p><span className="text-muted-foreground">Inputs/tools: </span>{r.inputs}</p>}
              {r.output && <p><span className="text-muted-foreground">Output: </span>{r.output}</p>}
              {r.boundary && <p><Badge variant="outline" className="mr-1">Boundary</Badge>{r.boundary}</p>}
              {r.human_owner && <p><span className="text-muted-foreground">Human owner: </span>{r.human_owner}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className="space-y-4">
      {!rows.length && <p className="text-sm text-muted-foreground">No mappings yet. Import the package from the Dashboard tab.</p>}
      {section("agent_spec", "Proposed agent specifications → personas", "Each spec from the registry is carried by one of your 17 existing personas. Boundaries and human owners apply; nothing here grants new permissions.")}
      {section("human_role", "Governance roles → support personas", "These roles require a named human. The mapped persona may prepare drafts and briefings for that person only.")}
    </div>
  );
}
