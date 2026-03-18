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
} from "lucide-react";

const workflows = [
  {
    id: "1",
    name: "Lead Qualification Pipeline",
    status: "active",
    steps: 5,
    runs: 142,
    lastRun: "2 minutes ago",
    success: 96,
  },
  {
    id: "2",
    name: "Weekly Executive Report",
    status: "active",
    steps: 4,
    runs: 24,
    lastRun: "1 hour ago",
    success: 100,
  },
  {
    id: "3",
    name: "Customer Onboarding Flow",
    status: "paused",
    steps: 7,
    runs: 89,
    lastRun: "3 hours ago",
    success: 91,
  },
  {
    id: "4",
    name: "Invoice Processing",
    status: "active",
    steps: 3,
    runs: 312,
    lastRun: "5 minutes ago",
    success: 99,
  },
];

const sampleSteps = [
  { type: "trigger", label: "New Lead from CRM", icon: Zap },
  { type: "ai", label: "Qualify & Score Lead", icon: Bot },
  { type: "condition", label: "Score > 80?", icon: GitBranch },
  { type: "action", label: "Create Task & Notify", icon: Settings },
  { type: "approval", label: "Manager Approval", icon: ShieldCheck },
];

const stepColors: Record<string, string> = {
  trigger: "border-primary/30 bg-primary/5",
  ai: "border-purple-500/30 bg-purple-500/5",
  condition: "border-amber-500/30 bg-amber-500/5",
  action: "border-emerald-500/30 bg-emerald-500/5",
  approval: "border-gold/30 bg-amber-500/5",
};

const stepIconColors: Record<string, string> = {
  trigger: "text-primary",
  ai: "text-purple-400",
  condition: "text-amber-400",
  action: "text-emerald-400",
  approval: "text-amber-400",
};

export default function Workflows() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Flow Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Automate workflows with AI-powered steps.</p>
        </div>
        <button className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
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
            className="glass-panel-hover p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{wf.name}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>{wf.steps} steps</span>
                  <span>{wf.runs} runs</span>
                  <span>{wf.success}% success</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                  wf.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {wf.status}
                </div>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Clock className="w-3 h-3" />
              Last run: {wf.lastRun}
            </div>
            <div className="flex items-center gap-2">
              <button className="command-btn flex items-center gap-1.5 text-xs">
                {wf.status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {wf.status === "active" ? "Pause" : "Activate"}
              </button>
              <button className="command-btn flex items-center gap-1.5 text-xs">
                <Play className="w-3 h-3" />
                Run Test
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Step Builder Preview */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-display font-semibold text-foreground mb-6">
          Workflow Step Editor — Lead Qualification Pipeline
        </h3>
        <div className="flex flex-col gap-3">
          {sampleSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`flex items-center gap-3 flex-1 p-4 rounded-lg border ${stepColors[step.type]}`}>
                <step.icon className={`w-5 h-5 ${stepIconColors[step.type]}`} />
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{step.type}</div>
                  <div className="text-sm font-medium text-foreground">{step.label}</div>
                </div>
              </div>
              {i < sampleSteps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 hidden md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
