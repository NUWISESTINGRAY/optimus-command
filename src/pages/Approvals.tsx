import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Edit,
  Workflow,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const riskStyle: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
  critical: "bg-red-500/10 text-red-400",
};

export default function Approvals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadApprovals();
  }, [user]);

  const loadApprovals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("approvals")
      .select("*")
      .order("created_at", { ascending: false });
    setApprovals(data || []);
    setLoading(false);
  };

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setActing(id);
    const approval = approvals.find((a) => a.id === id);
    
    const { error } = await supabase
      .from("approvals")
      .update({ status: action, decided_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // If approved and linked to ATLAS workflow run, resume the run
      if (action === "approved" && approval?.source_type === "atlas_workflow" && approval?.source_id) {
        try {
          const { data: run } = await supabase
            .from("atlas_workflow_runs")
            .select("*")
            .eq("id", approval.source_id)
            .eq("status", "paused")
            .single();

          if (run) {
            // Resume workflow from next step
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/atlas-run-workflow`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                workflow_id: run.workflow_id,
                input: run.input_json,
                source: "approval_resume",
              }),
            });
            toast({ title: "Workflow Resumed", description: "The linked ATLAS workflow has been resumed." });
          }
        } catch {
          // Non-critical — workflow resume is best effort
        }
      }

      toast({ title: action === "approved" ? "Approved" : "Rejected" });
      loadApprovals();
    }
    setActing(null);
  };

  // Split into pending and resolved
  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Approval Gate</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and authorize pending actions from ATLAS workflows and agents.</p>
      </div>

      {/* Pending */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">
          Pending ({pending.length})
        </h2>
        <div className="space-y-4">
          {pending.map((approval, i) => (
            <motion.div
              key={approval.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{approval.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {approval.source_type && (
                      <span className="flex items-center gap-1"><Workflow className="w-3 h-3" />{approval.source_type}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(approval.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${riskStyle[approval.risk_level] || riskStyle.low}`}>
                  {approval.risk_level} risk
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{approval.summary || approval.description}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(approval.id, "approved")}
                  disabled={acting === approval.id}
                  className="px-4 py-2 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {acting === approval.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve
                </button>
                <button
                  onClick={() => handleAction(approval.id, "rejected")}
                  disabled={acting === approval.id}
                  className="px-4 py-2 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </motion.div>
          ))}
          {pending.length === 0 && !loading && (
            <div className="glass-panel p-8 text-center">
              <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No pending approvals. All clear.</p>
            </div>
          )}
        </div>
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">
            Resolved ({resolved.length})
          </h2>
          <div className="space-y-3">
            {resolved.slice(0, 10).map((approval) => (
              <div key={approval.id} className="glass-panel p-4 opacity-70">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-foreground">{approval.title}</span>
                    <span className="text-xs text-muted-foreground ml-3">{approval.source_type}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                    approval.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {approval.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
