import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  Workflow,
  Bot,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Logs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "workflow" | "agent">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) loadLogs();
  }, [user]);

  const loadLogs = async () => {
    setLoading(true);
    const [runsRes, agentRes] = await Promise.all([
      supabase
        .from("atlas_workflow_runs")
        .select("*, atlas_workflows(name)")
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("agent_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50),
    ]);

    const workflowLogs = (runsRes.data || []).map((r: any) => ({
      id: r.id,
      type: "workflow",
      name: r.atlas_workflows?.name || "Workflow",
      status: r.status,
      timestamp: r.started_at,
      duration: r.completed_at ? `${((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000).toFixed(1)}s` : "—",
      source: r.source,
      error: r.error_message,
    }));

    const agentLogs = (agentRes.data || []).map((r: any) => ({
      id: r.id,
      type: "agent",
      name: `${r.agent_mode || r.agent_type} — ${r.task_type || "task"}`,
      status: r.status,
      timestamp: r.started_at,
      duration: r.completed_at ? `${((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000).toFixed(1)}s` : "—",
      confidence: r.confidence,
      error: r.error_message,
    }));

    const combined = [...workflowLogs, ...agentLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLogs(combined);
    setLoading(false);
  };

  const filteredLogs = logs
    .filter((l) => filter === "all" || l.type === filter)
    .filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()));

  const statusIcon: Record<string, JSX.Element> = {
    completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
    running: <Clock className="w-4 h-4 text-primary animate-pulse-glow" />,
    paused: <Clock className="w-4 h-4 text-amber-400" />,
    cancelled: <XCircle className="w-4 h-4 text-muted-foreground" />,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Execution Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor ATLAS workflow runs, agent tasks, and system activity.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 glass-panel px-4 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "workflow", "agent"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs rounded-md transition-colors ${
                filter === f ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {f === "all" ? "All" : f === "workflow" ? "ATLAS" : "Agent"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Duration</th>
                <th className="text-left p-4 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                >
                  <td className="p-4">{statusIcon[log.status] || statusIcon.running}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {log.type === "workflow" ? <Workflow className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      <span className="capitalize">{log.type === "workflow" ? "ATLAS" : "Agent"}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-foreground">{log.name}</span>
                    {log.error && <span className="text-xs text-red-400 ml-2">({log.error})</span>}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{log.duration}</td>
                  <td className="p-4 text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                </motion.tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                    No execution logs found. Run a workflow or chat with Optimus to generate activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
