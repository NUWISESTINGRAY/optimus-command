import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Filter,
  Sparkles,
  MoreHorizontal,
  Calendar,
  User,
  Folder,
  ChevronRight,
} from "lucide-react";

type TaskStatus = "todo" | "active" | "blocked" | "done";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "high" | "medium" | "low";
  project: string;
  owner: string;
  due: string;
}

const sampleTasks: Task[] = [
  { id: "1", title: "Finalize Q1 board presentation", status: "active", priority: "high", project: "Executive", owner: "You", due: "Mar 18" },
  { id: "2", title: "Review vendor contract proposals", status: "active", priority: "high", project: "Operations", owner: "You", due: "Mar 19" },
  { id: "3", title: "Approve marketing campaign assets", status: "todo", priority: "medium", project: "Marketing", owner: "Sarah K.", due: "Mar 20" },
  { id: "4", title: "Complete hiring pipeline review", status: "todo", priority: "medium", project: "HR", owner: "Mike R.", due: "Mar 21" },
  { id: "5", title: "Set up analytics dashboard", status: "blocked", priority: "low", project: "Engineering", owner: "Dev Team", due: "Mar 22" },
  { id: "6", title: "Onboard new enterprise client", status: "done", priority: "high", project: "Sales", owner: "You", due: "Mar 15" },
  { id: "7", title: "Update SOP documentation", status: "done", priority: "low", project: "Operations", owner: "Lisa P.", due: "Mar 14" },
];

const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo: { label: "To Do", color: "text-muted-foreground", bg: "bg-muted/30" },
  active: { label: "Active", color: "text-primary", bg: "bg-primary/10" },
  blocked: { label: "Blocked", color: "text-amber-400", bg: "bg-amber-500/10" },
  done: { label: "Done", color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

const priorityDot: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-muted-foreground",
};

export default function Tasks() {
  const [view, setView] = useState<"board" | "list">("board");
  const statuses: TaskStatus[] = ["todo", "active", "blocked", "done"];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Mission Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage tasks across all projects.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="command-btn flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Turn Goal into Tasks
          </button>
          <button className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-md border border-border overflow-hidden">
          {(["board", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                view === v ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md border border-border">
          <Filter className="w-3 h-3" />
          Filter
        </button>
      </div>

      {/* Board View */}
      {view === "board" && (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statuses.map((status) => {
            const config = statusConfig[status];
            const tasks = sampleTasks.filter((t) => t.status === status);
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium uppercase tracking-wider ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{tasks.length}</span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                </div>
                <div className="space-y-3">
                  {tasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-panel-hover p-4 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${priorityDot[task.priority]}`} />
                          <span className="text-sm text-foreground font-medium">{task.title}</span>
                        </div>
                        <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3">
                        <span className="flex items-center gap-1"><Folder className="w-3 h-3" />{task.project}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{task.due}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                        <User className="w-3 h-3" />
                        {task.owner}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="glass-panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left p-4 font-medium">Task</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Project</th>
                <th className="text-left p-4 font-medium">Owner</th>
                <th className="text-left p-4 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {sampleTasks.map((task) => {
                const config = statusConfig[task.status];
                return (
                  <tr key={task.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${priorityDot[task.priority]}`} />
                        <span className="text-sm text-foreground">{task.title}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{task.project}</td>
                    <td className="p-4 text-sm text-muted-foreground">{task.owner}</td>
                    <td className="p-4 text-sm text-muted-foreground">{task.due}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
