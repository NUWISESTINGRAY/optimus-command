import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Play, Pause, Trash2, Workflow as WorkflowIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function AutomationsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("automation_workflows").select("*").order("updated_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function create() {
    if (!user) return;
    const { data, error } = await supabase.from("automation_workflows").insert({
      user_id: user.id,
      name: "New Automation",
      trigger_type: "manual",
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (data) navigate(`/automations/${data.id}`);
  }

  async function toggleActive(wf: any) {
    await supabase.from("automation_workflows").update({ active: !wf.active }).eq("id", wf.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this automation?")) return;
    await supabase.from("automation_workflows").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">Visual node-based workflows. Drag, connect, automate.</p>
        </div>
        <button onClick={create} className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Automation
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((wf) => (
          <div key={wf.id} className="glass-panel-hover p-5 group">
            <Link to={`/automations/${wf.id}`} className="block">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <WorkflowIcon className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{wf.name}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${wf.active ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                  {wf.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[2rem]">{wf.description || "No description"}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Trigger: {wf.trigger_type}</span>
                {wf.last_run_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(wf.last_run_at).toLocaleString()}</span>}
              </div>
            </Link>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
              <button onClick={() => toggleActive(wf)} className="command-btn flex items-center gap-1.5 text-xs">
                {wf.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {wf.active ? "Pause" : "Activate"}
              </button>
              <Link to={`/automations/${wf.id}/runs`} className="command-btn flex items-center gap-1.5 text-xs">
                <Clock className="w-3 h-3" /> Runs
              </Link>
              <button onClick={() => remove(wf.id)} className="ml-auto p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="glass-panel p-8 text-center col-span-full">
            <WorkflowIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No automations yet. Create your first one.</p>
          </div>
        )}
      </div>
    </div>
  );
}