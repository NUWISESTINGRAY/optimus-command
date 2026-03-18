import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  ChevronRight,
  Workflow,
  Bot,
} from "lucide-react";

const logs = [
  { id: "1", type: "workflow", name: "Lead Qualification Pipeline", status: "success", duration: "1.2s", timestamp: "Mar 18, 10:31 AM", items: 5 },
  { id: "2", type: "agent", name: "CFO Analysis — Q1 Revenue", status: "success", duration: "4.8s", timestamp: "Mar 18, 10:28 AM", items: 1 },
  { id: "3", type: "workflow", name: "Invoice Processing", status: "success", duration: "0.8s", timestamp: "Mar 18, 10:15 AM", items: 12 },
  { id: "4", type: "workflow", name: "Customer Onboarding Flow", status: "error", duration: "2.1s", timestamp: "Mar 18, 09:45 AM", items: 1 },
  { id: "5", type: "agent", name: "Research — Competitive Landscape", status: "success", duration: "12.3s", timestamp: "Mar 18, 09:30 AM", items: 1 },
  { id: "6", type: "workflow", name: "Weekly Executive Report", status: "success", duration: "6.5s", timestamp: "Mar 18, 08:00 AM", items: 1 },
  { id: "7", type: "workflow", name: "Lead Qualification Pipeline", status: "success", duration: "1.1s", timestamp: "Mar 18, 07:45 AM", items: 3 },
  { id: "8", type: "agent", name: "Draft — Board Meeting Agenda", status: "success", duration: "8.2s", timestamp: "Mar 17, 04:30 PM", items: 1 },
];

const statusIcon = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  running: <Clock className="w-4 h-4 text-primary animate-pulse-glow" />,
};

export default function Logs() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Execution Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor workflow runs, agent tasks, and system activity.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 glass-panel px-4 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search logs..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-md border border-border">
          <Filter className="w-3 h-3" />
          Filter
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Type</th>
              <th className="text-left p-4 font-medium">Name</th>
              <th className="text-left p-4 font-medium">Items</th>
              <th className="text-left p-4 font-medium">Duration</th>
              <th className="text-left p-4 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <motion.tr
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
              >
                <td className="p-4">{statusIcon[log.status as keyof typeof statusIcon]}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {log.type === "workflow" ? <Workflow className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    <span className="capitalize">{log.type}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-foreground">{log.name}</td>
                <td className="p-4 text-sm text-muted-foreground">{log.items}</td>
                <td className="p-4 text-sm text-muted-foreground">{log.duration}</td>
                <td className="p-4 text-xs text-muted-foreground">{log.timestamp}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
