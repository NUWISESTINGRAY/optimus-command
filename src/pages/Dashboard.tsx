import { useState, useEffect } from "react";
import { useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  AlertTriangle,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle2,
  Workflow,
  Target,
  Sparkles,
  Send,
  PenLine,
  Search,
  ListTodo,
  Bot,
  MessageSquare,
  ShieldCheck,
  Volume2,
  Square,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimus-tts`;

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ projects: 0, tasks: 0, workflows: 0, approvals: 0 });
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [recentAgentRuns, setRecentAgentRuns] = useState<any[]>([]);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [greetingState, setGreetingState] = useState<"idle" | "loading" | "playing">("idle");
  const greetingAudioRef = useRef<HTMLAudioElement | null>(null);

  const greetingText = user
    ? `Greetings Commander. Optimus reporting. You have ${stats.approvals} pending approval${stats.approvals === 1 ? "" : "s"} and ${stats.tasks} open task${stats.tasks === 1 ? "" : "s"}. ${stats.workflows} ATLAS workflow${stats.workflows === 1 ? " is" : "s are"} active. Standing by for your orders.`
    : "Greetings Commander. Optimus standing by.";

  const playGreeting = async () => {
    if (greetingState === "playing" && greetingAudioRef.current) {
      greetingAudioRef.current.pause();
      greetingAudioRef.current = null;
      setGreetingState("idle");
      return;
    }
    setGreetingState("loading");
    try {
      const r = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: greetingText }),
      });
      if (!r.ok) throw new Error(`TTS ${r.status}`);
      const { audioBase64 } = await r.json();
      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
      greetingAudioRef.current = audio;
      audio.onended = () => { setGreetingState("idle"); greetingAudioRef.current = null; };
      await audio.play();
      setGreetingState("playing");
    } catch (e) {
      console.error(e);
      setGreetingState("idle");
    }
  };

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    const [projectsRes, tasksRes, wfRes, approvalsRes, runsRes, agentRes, telegramRes] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
      supabase.from("atlas_workflows").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("approvals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("atlas_workflow_runs").select("*, atlas_workflows(name)").order("started_at", { ascending: false }).limit(5),
      supabase.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(5),
      supabase.from("telegram_connections").select("id").eq("user_id", user!.id).eq("is_active", true).maybeSingle(),
    ]);

    setStats({
      projects: projectsRes.count || 0,
      tasks: tasksRes.count || 0,
      workflows: wfRes.count || 0,
      approvals: approvalsRes.count || 0,
    });
    setRecentRuns(runsRes.data || []);
    setRecentAgentRuns(agentRes.data || []);
    setTelegramConnected(!!telegramRes.data);
  };

  const kpis = [
    { label: "Active Projects", value: String(stats.projects), icon: Target, color: "text-primary" },
    { label: "Open Tasks", value: String(stats.tasks), icon: CheckCircle2, color: "text-emerald-400" },
    { label: "ATLAS Workflows", value: String(stats.workflows), icon: Workflow, color: "text-purple-400" },
    { label: "Pending Approvals", value: String(stats.approvals), icon: Clock, color: "text-amber-400" },
  ];

  const quickActions = [
    { label: "Ask Optimus", icon: MessageSquare, action: () => navigate("/chat") },
    { label: "Build Workflow", icon: Workflow, action: () => navigate("/workflows") },
    { label: "Review Approvals", icon: ShieldCheck, action: () => navigate("/approvals") },
    { label: "Research Topic", icon: Search, action: () => navigate("/chat") },
    { label: "Write Document", icon: PenLine, action: () => navigate("/documents") },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div {...fadeIn}>
        <h1 className="text-2xl font-display font-bold text-foreground">Command Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Good morning. Here's your operational overview.</p>
      </motion.div>

      {/* Daily Briefing */}
      <motion.div {...fadeIn} transition={{ delay: 0.05 }} className="glass-panel p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary tracking-wider uppercase">System Briefing</span>
            </div>
            <h2 className="text-lg font-display font-semibold text-foreground mb-2">Daily Intelligence Report</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              You have <span className="text-foreground font-medium">{stats.approvals} pending approvals</span> requiring attention.
              <span className="text-foreground font-medium"> {stats.workflows} ATLAS workflows</span> are active.
              {telegramConnected && " Telegram is connected and operational."}
              {!telegramConnected && " Connect Telegram in Settings for mobile access."}
            </p>
            <button
              onClick={playGreeting}
              disabled={greetingState === "loading"}
              className="mt-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              {greetingState === "loading" ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Synthesizing Optimus…</>
              ) : greetingState === "playing" ? (
                <><Square className="w-3.5 h-3.5" /> Stop briefing</>
              ) : (
                <><Volume2 className="w-3.5 h-3.5" /> Hear briefing in Optimus's voice</>
              )}
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="status-dot-active" />
            <span>System Online</span>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeIn} transition={{ delay: 0.1 + i * 0.05 }} className="kpi-card">
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
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
            <button key={action.label} onClick={action.action} className="command-btn flex items-center gap-2">
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ATLAS Runs */}
        <motion.div {...fadeIn} transition={{ delay: 0.35 }} className="glass-panel p-5">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Recent ATLAS Runs
          </h3>
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    run.status === "completed" ? "bg-emerald-400" :
                    run.status === "failed" ? "bg-red-400" :
                    run.status === "paused" ? "bg-amber-400" : "bg-primary"
                  }`} />
                  <span className="text-sm text-foreground">{(run as any).atlas_workflows?.name || "Workflow"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                    run.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                    run.status === "failed" ? "bg-red-500/10 text-red-400" :
                    "bg-amber-500/10 text-amber-400"
                  }`}>{run.status}</span>
                </div>
              </div>
            ))}
            {recentRuns.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No workflow runs yet</p>
            )}
          </div>
        </motion.div>

        {/* Agent Runs */}
        <motion.div {...fadeIn} transition={{ delay: 0.4 }} className="glass-panel p-5">
          <h3 className="text-sm font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            Recent Agent Activity
          </h3>
          <div className="space-y-2">
            {recentAgentRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${run.status === "completed" ? "bg-emerald-400" : "bg-red-400"}`} />
                  <div>
                    <span className="text-sm text-foreground">{run.agent_mode || run.agent_type}</span>
                    <span className="text-xs text-muted-foreground ml-2">{run.task_type}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(run.started_at).toLocaleTimeString()}</span>
              </div>
            ))}
            {recentAgentRuns.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No agent activity yet. Start chatting with Optimus.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Telegram Widget */}
      <motion.div {...fadeIn} transition={{ delay: 0.45 }} className="glass-panel p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-display font-semibold text-foreground">Telegram</h3>
              <p className="text-xs text-muted-foreground">
                {telegramConnected ? "Connected — receive and respond via Telegram bot" : "Not connected — set up in Settings > Integrations"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {telegramConnected ? (
              <>
                <div className="status-dot-active" />
                <span className="text-xs text-emerald-400">Active</span>
              </>
            ) : (
              <button onClick={() => navigate("/settings")} className="command-btn text-xs">Connect</button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
