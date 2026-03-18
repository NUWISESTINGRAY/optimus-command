import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Edit,
  Workflow,
  ArrowRight,
} from "lucide-react";

interface Approval {
  id: string;
  title: string;
  source: string;
  risk: "low" | "medium" | "high";
  summary: string;
  status: "pending" | "approved" | "rejected";
  created: string;
}

const initialApprovals: Approval[] = [
  { id: "1", title: "Publish Q1 Marketing Campaign", source: "Marketing Workflow", risk: "medium", summary: "Auto-generated campaign targeting 50K subscribers with new product messaging.", status: "pending", created: "2 hours ago" },
  { id: "2", title: "Vendor Contract — AutoCorp Renewal", source: "Contract Review Flow", risk: "high", summary: "3-year renewal at 12% increase. Legal flagged two clauses requiring review.", status: "pending", created: "5 hours ago" },
  { id: "3", title: "Deploy Infrastructure Update", source: "DevOps Pipeline", risk: "low", summary: "Routine security patch deployment. All tests passing. Zero downtime expected.", status: "pending", created: "1 day ago" },
  { id: "4", title: "New Employee Access Provisioning", source: "HR Onboarding Flow", risk: "low", summary: "Grant standard access to 3 new hires starting Monday.", status: "approved", created: "2 days ago" },
];

const riskStyle: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
};

export default function Approvals() {
  const [approvals, setApprovals] = useState(initialApprovals);

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status: action } : a)));
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Approval Gate</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and authorize pending actions.</p>
      </div>

      <div className="space-y-4">
        {approvals.map((approval, i) => (
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
                  <span className="flex items-center gap-1"><Workflow className="w-3 h-3" />{approval.source}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{approval.created}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${riskStyle[approval.risk]}`}>
                  {approval.risk} risk
                </span>
                {approval.status !== "pending" && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                    approval.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {approval.status}
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{approval.summary}</p>
            {approval.status === "pending" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(approval.id, "approved")}
                  className="px-4 py-2 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => handleAction(approval.id, "rejected")}
                  className="px-4 py-2 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
                <button className="px-4 py-2 rounded-md text-xs font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
