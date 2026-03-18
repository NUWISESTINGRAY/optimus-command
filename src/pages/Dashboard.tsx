import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  MessageSquare,
  Workflow,
  Target,
  Sparkles,
  Send,
  PenLine,
  Search,
  ListTodo,
} from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const kpis = [
  { label: "Active Projects", value: "12", change: "+2", up: true, icon: Target },
  { label: "Tasks Completed", value: "47", change: "+8 today", up: true, icon: CheckCircle2 },
  { label: "Workflows Running", value: "5", change: "2 pending", up: true, icon: Workflow },
  { label: "Pending Approvals", value: "3", change: "1 urgent", up: false, icon: Clock },
];

const priorities = [
  { title: "Review Q1 financial report", priority: "high", due: "Today", project: "Finance" },
  { title: "Approve marketing campaign", priority: "high", due: "Today", project: "Marketing" },
  { title: "Finalize vendor contract terms", priority: "medium", due: "Tomorrow", project: "Operations" },
  { title: "Prepare board deck slides", priority: "medium", due: "Mar 20", project: "Executive" },
  { title: "Review hiring pipeline", priority: "low", due: "Mar 21", project: "HR" },
];

const recentWorkflows = [
  { name: "Lead Qualification Pipeline", status: "active", runs: 142, lastRun: "2m ago" },
  { name: "Weekly Report Generation", status: "active", runs: 24, lastRun: "1h ago" },
  { name: "Customer Onboarding", status: "paused", runs: 89, lastRun: "3h ago" },
];

const alerts = [
  { type: "warning", message: "Contract renewal deadline in 3 days — AutoCorp Inc." },
  { type: "info", message: "AI research completed: Market Analysis for Q2 expansion" },
  { type: "success", message: "Workflow 'Invoice Processing' completed 47 runs today" },
];

const quickActions = [
  { label: "Summarize", icon: Sparkles },
  { label: "Draft Reply", icon: Send },
  { label: "Build Plan", icon: ListTodo },
  { label: "Create Workflow", icon: Workflow },
  { label: "Research Topic", icon: Search },
  { label: "Write Document", icon: PenLine },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div {...fadeIn}>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Command Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Good morning. Here's your operational overview.
        </p>
      </motion.div>

      {/* Daily Briefing */}
      <motion.div {...fadeIn} transition={{ delay: 0.05 }} className="glass-panel p-6 col-span-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">System Briefing</span>
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-2">
              Daily Intelligence Report
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              You have <span className="text-foreground font-medium">3 pending approvals</span> requiring attention, 
              including 1 flagged as urgent. <span className="text-foreground font-medium">2 workflows</span> completed 
              overnight processing 89 items. Your Q1 financial report is due for review today. 
              The marketing campaign for Project Aurora awaits your sign-off.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="status-dot-active" />
            <span>Updated just now</span>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            {...fadeIn}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="kpi-card"
          >
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className="w-4 h-4 text-muted-foreground" />
              {kpi.up ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <ArrowUpRight className="w-3 h-3" />
                  {kpi.change}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  {kpi.change}
                </span>
              )}
            </div>
            <div className="text-2xl font-display font-bold text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
        <h3 className="text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button key={action.label} className="command-btn flex items-center gap-2">
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Priorities */}
        <motion.div {...fadeIn} transition={{ delay: 0.35 }} className="lg:col-span-2 glass-panel p-5">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Today's Priorities
          </h3>
          <div className="space-y-3">
            {priorities.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    item.priority === "high" ? "bg-red-400" : item.priority === "medium" ? "bg-amber-400" : "bg-muted-foreground"
                  }`} />
                  <span className="text-sm text-foreground">{item.title}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">{item.project}</span>
                  <span>{item.due}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div {...fadeIn} transition={{ delay: 0.4 }} className="glass-panel p-5">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Alerts & Anomalies
          </h3>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className={`mt-0.5 ${
                  alert.type === "warning" ? "status-dot-warning" : 
                  alert.type === "info" ? "status-dot bg-primary" : "status-dot-active"
                }`} />
                <span className="text-xs text-muted-foreground leading-relaxed">{alert.message}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Workflows */}
      <motion.div {...fadeIn} transition={{ delay: 0.45 }} className="glass-panel p-5">
        <h3 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Workflow className="w-4 h-4 text-primary" />
          Recent Workflows
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {recentWorkflows.map((wf, i) => (
            <div key={i} className="p-4 rounded-md bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{wf.name}</span>
                <div className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                  wf.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  {wf.status}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{wf.runs} runs</span>
                <span>Last: {wf.lastRun}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
