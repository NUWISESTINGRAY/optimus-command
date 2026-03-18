import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Link,
  Shield,
  Brain,
  Bot,
  Lock,
  Bell,
  Send as TelegramIcon,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const sections = [
  { id: "profile", label: "Profile", icon: User, description: "Manage your account and preferences" },
  { id: "integrations", label: "Integrations", icon: Link, description: "Connect external tools and services" },
  { id: "roles", label: "Roles & Permissions", icon: Shield, description: "Manage team access and roles" },
  { id: "memory", label: "Memory Controls", icon: Brain, description: "Configure AI memory and context settings" },
  { id: "agent", label: "Agent Behavior", icon: Bot, description: "Customize AI agent personality and defaults" },
  { id: "security", label: "Security & Approvals", icon: Lock, description: "Set approval thresholds and security policies" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Configure alert and notification preferences" },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState("profile");
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [telegramConnection, setTelegramConnection] = useState<any>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadTelegramConnection();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user!.id)
      .single();
    setProfile(data);
  };

  const loadTelegramConnection = async () => {
    const { data } = await supabase
      .from("telegram_connections")
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_active", true)
      .maybeSingle();
    setTelegramConnection(data);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        full_name: profile.full_name,
        job_title: profile.job_title,
        company: profile.company,
      })
      .eq("user_id", user!.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
    }
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your OPTIMUS experience.</p>
        </div>
        <button onClick={signOut} className="px-4 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-red-400 border border-border hover:border-red-500/30 transition-colors flex items-center gap-2">
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActive(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 text-left ${
                active === section.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <section.icon className="w-4 h-4 flex-shrink-0" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-2 glass-panel p-6">
          <h2 className="text-lg font-display font-semibold text-foreground mb-2">
            {sections.find((s) => s.id === active)?.label}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {sections.find((s) => s.id === active)?.description}
          </p>

          {active === "profile" && profile && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Display Name</label>
                <input
                  value={profile.display_name || ""}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="w-full px-4 py-2 rounded-md bg-secondary/50 border border-border text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
                <input
                  value={profile.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full px-4 py-2 rounded-md bg-secondary/50 border border-border text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-2 rounded-md bg-secondary/30 border border-border text-sm text-muted-foreground outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Job Title</label>
                <input
                  value={profile.job_title || ""}
                  onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                  className="w-full px-4 py-2 rounded-md bg-secondary/50 border border-border text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Company</label>
                <input
                  value={profile.company || ""}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  className="w-full px-4 py-2 rounded-md bg-secondary/50 border border-border text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-2 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          )}

          {active === "integrations" && (
            <div className="space-y-4">
              {/* OpenAI Status */}
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="text-sm font-medium text-foreground">AI Engine (Lovable AI)</h4>
                      <p className="text-xs text-muted-foreground">Powers OPTIMUS agent modes and ATLAS AI actions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Connected</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">API keys are stored securely server-side. No client exposure.</p>
              </div>

              {/* Telegram */}
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <TelegramIcon className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="text-sm font-medium text-foreground">Telegram</h4>
                      <p className="text-xs text-muted-foreground">Receive and respond to messages via Telegram bot</p>
                    </div>
                  </div>
                  {telegramConnection ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-emerald-400 font-medium">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Not Connected</span>
                    </div>
                  )}
                </div>
                {!telegramConnection && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">To connect Telegram:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Create a bot via @BotFather on Telegram</li>
                      <li>Connect the Telegram integration in workspace settings</li>
                      <li>Send /start to your bot to link your chat</li>
                    </ol>
                    <button className="command-btn text-xs mt-2">Connect Telegram</button>
                  </div>
                )}
                {telegramConnection && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>Bot: {telegramConnection.bot_name || "Connected"} · Chat ID: {telegramConnection.chat_id}</p>
                  </div>
                )}
              </div>

              {/* Other Integrations */}
              <div className="space-y-2">
                {["Slack", "Google Workspace", "Salesforce", "HubSpot", "Stripe", "GitHub"].map((int) => (
                  <div key={int} className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border/50">
                    <span className="text-sm text-foreground">{int}</span>
                    <button className="command-btn text-xs">Connect</button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-4 p-3 rounded-md bg-primary/5 border border-primary/15">
                🔒 All API keys and secrets are stored securely on the server. No sensitive credentials are exposed to the browser.
              </p>
            </div>
          )}

          {active === "agent" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                OPTIMUS uses 10 specialized agent modes. Each mode has a tuned system prompt and behavior pattern.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {["Auto", "COO", "CMO", "CFO", "CTO", "CRO", "HR", "Research", "Executive Assistant", "Chief of Staff"].map((mode) => (
                  <div key={mode} className="p-3 rounded-md bg-secondary/30 border border-border/50">
                    <span className="text-sm font-medium text-foreground">{mode}</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mode === "Auto" ? "Automatically classifies and routes" : `Specialized for ${mode.toLowerCase()} operations`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active !== "profile" && active !== "integrations" && active !== "agent" && (
            <div className="text-sm text-muted-foreground">
              Configuration options for {sections.find((s) => s.id === active)?.label?.toLowerCase()} will be available here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
