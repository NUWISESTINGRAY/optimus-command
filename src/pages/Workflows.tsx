import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Play,
  Pause,
  Zap,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  ArrowRight,
  Bot,
  ShieldCheck,
  Settings,
  Loader2,
  Trash2,
  Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const stepColors: Record<string, string> = {
  trigger: "border-primary/30 bg-primary/5",
  ai_action: "border-purple-500/30 bg-purple-500/5",
  condition: "border-amber-500/30 bg-amber-500/5",
  action: "border-emerald-500/30 bg-emerald-500/5",
  approval: "border-amber-500/30 bg-amber-500/5",
};

const stepIconMap: Record<string, any> = {
  trigger: Zap,
  ai_action: Bot,
  condition: GitBranch,
  action: Settings,
  approval: ShieldCheck,
};

const stepIconColors: Record<string, string> = {
  trigger: "text-primary",
  ai_action: "text-purple-400",
  condition: "text-amber-400",
  action: "text-emerald-400",
  approval: "text-amber-400",
};

export default function Workflows() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [runningTest, setRunningTest] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [wfRes, runsRes] = await Promise.all([
      supabase.from("atlas_workflows").select("*").order("updated_at", { ascending: false }),
      supabase.from("atlas_workflow_runs").select("*, atlas_workflows(name)").order("started_at", { ascending: false }).limit(20),
    ]);
    setWorkflows(wfRes.data || []);
    setRuns(runsRes.data || []);
    setLoading(false);
  };

  const loadSteps = async (workflowId: string) => {
    const { data } = await supabase
      .from("atlas_workflow_steps")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("step_order", { ascending: true });
    setSteps(data || []);
  };

  const selectWorkflow = async (wf: any) => {
    setSelectedWorkflow(wf);
    await loadSteps(wf.id);
  };

  const createWorkflow = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("atlas_workflows").insert({
      user_id: user.id,
      name: "New Workflow",
      description: "Describe your workflow",
      status: "draft",
      trigger_type: "manual",
    }).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      await loadData();
      selectWorkflow(data);
    }
  };

  const toggleActive = async (wf: any) => {
    await supabase.from("atlas_workflows").update({
      active: !wf.active,
      status: !wf.active ? "active" : "paused",
    }).eq("id", wf.id);
    loadData();
  };

  const addStep = async (type: string) => {
    if (!selectedWorkflow || !user) return;
    const order = steps.length;
    await supabase.from("atlas_workflow_steps").insert({
      workflow_id: selectedWorkflow.id,
      step_order: order,
      step_type: type,
      title: `${type.replace("_", " ")} step`,
      config_json: {},
    });
    loadSteps(selectedWorkflow.id);
  };

  const deleteStep = async (stepId: string) => {
    await supabase.from("atlas_workflow_steps").delete().eq("id", stepId);
    loadSteps(selectedWorkflow.id);
  };

  const runTest = async (workflowId: string) => {
    setRunningTest(workflowId);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/atlas-run-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ workflow_id: workflowId, test_mode: true, input: {} }),
      });
      const result = await resp.json();
      if (result.error) {
        toast({ title: "Test Failed", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Test Complete", description: `Status: ${result.status} · ${result.steps_executed} steps executed` });
        loadData();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRunningTest(null);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-500/10 text-emerald-400",
      completed: "bg-emerald-500/10 text-emerald-400",
      draft: "bg-secondary text-muted-foreground",
      paused: "bg-amber-500/10 text-amber-400",
      running: "bg-primary/10 text-primary",
      failed: "bg-red-500/10 text-red-400",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">ATLAS Flow Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Build and execute AI-powered workflows with approval gates.</p>
        </div>
        <button onClick={createWorkflow} className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {/* Workflow Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {workflows.map((wf, i) => (
          <motion.div
            key={wf.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass-panel-hover p-5 cursor-pointer ${selectedWorkflow?.id === wf.id ? "border-primary/40" : ""}`}
            onClick={() => selectWorkflow(wf)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{wf.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{wf.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(wf.status)}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>Trigger: {wf.trigger_type}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleActive(wf); }}
                className="command-btn flex items-center gap-1.5 text-xs"
              >
                {wf.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {wf.active ? "Pause" : "Activate"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); runTest(wf.id); }}
                disabled={runningTest === wf.id}
                className="command-btn flex items-center gap-1.5 text-xs"
              >
                {runningTest === wf.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run Test
              </button>
            </div>
          </motion.div>
        ))}
        {workflows.length === 0 && !loading && (
          <div className="glass-panel p-8 text-center col-span-2">
            <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No workflows yet. Create your first ATLAS workflow.</p>
          </div>
        )}
      </div>

      {/* Step Editor */}
      {selectedWorkflow && (
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-display font-semibold text-foreground">
              Workflow Editor — {selectedWorkflow.name}
            </h3>
            <div className="flex gap-2">
              {["trigger", "ai_action", "condition", "action", "approval"].map((type) => {
                const Icon = stepIconMap[type];
                return (
                  <button key={type} onClick={() => addStep(type)} className="command-btn flex items-center gap-1.5 text-xs">
                    <Icon className="w-3 h-3" />
                    + {type.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {steps.map((step, i) => {
              const Icon = stepIconMap[step.step_type] || Settings;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`flex items-center gap-3 flex-1 p-4 rounded-lg border ${stepColors[step.step_type] || ""}`}>
                    <Icon className={`w-5 h-5 ${stepIconColors[step.step_type] || ""}`} />
                    <div className="flex-1">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{step.step_type.replace("_", " ")}</div>
                      <div className="text-sm font-medium text-foreground">{step.title}</div>
                    </div>
                    <button onClick={() => deleteStep(step.id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {i < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 hidden md:block" />
                  )}
                </div>
              );
            })}
            {steps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Add steps to build your workflow</p>
            )}
          </div>
        </div>
      )}

      {/* Run History */}
      {runs.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Run History
          </h3>
          <div className="space-y-2">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border/50">
                <div className="flex items-center gap-3">
                  {statusBadge(run.status)}
                  <span className="text-sm text-foreground">{(run as any).atlas_workflows?.name || "Workflow"}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Source: {run.source}</span>
                  <span>{new Date(run.started_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
