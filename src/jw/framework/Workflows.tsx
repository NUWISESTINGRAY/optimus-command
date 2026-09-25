import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Markdown } from "./shared";

export default function Workflows() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const load = async () => {
    const { data } = await supabase.from("atlas_workflows").select("*").like("name", "JW W%").order("name");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const toggle = async (w: any) => {
    if (!w.active && !window.confirm(`Activate "${w.name}"? It has no executable steps until you build them in ATLAS Engine, and approval gates still apply.`)) return;
    const { error } = await supabase.from("atlas_workflows").update({ active: !w.active, status: w.active ? "draft" : "active" }).eq("id", w.id);
    if (error) return toast.error(error.message);
    load();
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Ten blueprint workflows imported as <b className="text-foreground">inactive drafts</b> with a manual trigger and no steps. Build steps in <Link to="/workflows" className="text-primary">ATLAS Engine</Link> before activating.</p>
      {rows.map((w) => (
        <div key={w.id} className="glass-panel p-4">
          <div className="flex items-center gap-3">
            <button className="flex-1 text-left text-sm font-medium text-foreground" onClick={() => setOpen(open === w.id ? null : w.id)}>{w.name}</button>
            <Badge variant={w.active ? "default" : "outline"}>{w.active ? "active" : "inactive draft"}</Badge>
            <Button size="sm" variant="outline" onClick={() => toggle(w)}>{w.active ? "Deactivate" : "Activate…"}</Button>
          </div>
          {open === w.id && <div className="mt-3"><Markdown>{w.description ?? ""}</Markdown></div>}
        </div>
      ))}
      {!rows.length && <p className="text-sm text-muted-foreground">No workflow drafts yet. Import the package from the Dashboard tab.</p>}
    </div>
  );
}
