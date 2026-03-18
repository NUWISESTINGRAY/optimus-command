import { motion } from "framer-motion";
import {
  User,
  Link,
  Shield,
  Brain,
  Bot,
  Lock,
  Bell,
  Palette,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

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
  const [active, setActive] = useState("profile");

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your OPTIMUS experience.</p>
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

          {active === "profile" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Display Name</label>
                <input defaultValue="Executive User" className="w-full px-4 py-2 rounded-md bg-secondary/50 border border-border text-sm text-foreground outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                <input defaultValue="exec@company.com" className="w-full px-4 py-2 rounded-md bg-secondary/50 border border-border text-sm text-foreground outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Role</label>
                <input defaultValue="Chief Executive Officer" className="w-full px-4 py-2 rounded-md bg-secondary/50 border border-border text-sm text-foreground outline-none focus:border-primary/50" />
              </div>
              <button className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-2">
                Save Changes
              </button>
            </div>
          )}

          {active === "integrations" && (
            <div className="space-y-3">
              {["Slack", "Google Workspace", "Salesforce", "HubSpot", "Stripe", "GitHub"].map((int) => (
                <div key={int} className="flex items-center justify-between p-4 rounded-md bg-secondary/30 border border-border/50">
                  <span className="text-sm text-foreground">{int}</span>
                  <button className="command-btn text-xs">Connect</button>
                </div>
              ))}
            </div>
          )}

          {active !== "profile" && active !== "integrations" && (
            <div className="text-sm text-muted-foreground">
              Configuration options for {sections.find((s) => s.id === active)?.label?.toLowerCase()} will be available here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
