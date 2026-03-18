import { motion } from "framer-motion";
import {
  Mail,
  Star,
  Clock,
  Send,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  MoreHorizontal,
  Reply,
  MessageSquare,
} from "lucide-react";

const threads = [
  { id: "1", from: "Sarah Chen", subject: "Re: Q2 Partnership Proposal", preview: "Thanks for sending over the revised terms. I've reviewed the pricing structure and...", time: "10:32 AM", priority: "high", unread: true },
  { id: "2", from: "Michael Ross", subject: "Board Meeting Agenda — March 20th", preview: "Hi team, please find the agenda for next week's board meeting. Key topics include...", time: "9:15 AM", priority: "medium", unread: true },
  { id: "3", from: "Legal Team", subject: "Contract Review: AutoCorp Renewal", preview: "The legal review is complete. We've flagged two clauses in Section 4.2 that need...", time: "Yesterday", priority: "high", unread: false },
  { id: "4", from: "HR Department", subject: "New Hire Onboarding — Week 12", preview: "This week we're onboarding 3 new team members. Please review the assigned mentors...", time: "Yesterday", priority: "low", unread: false },
  { id: "5", from: "David Liu", subject: "Product Launch Timeline Update", preview: "Following our discussion, I've adjusted the launch timeline. The new target date is...", time: "Mar 15", priority: "medium", unread: false },
];

const actions = [
  { label: "Reply Professionally", icon: Reply },
  { label: "Reply Short", icon: MessageSquare },
  { label: "Summarize Thread", icon: Sparkles },
  { label: "Decline Politely", icon: Send },
];

export default function EmailPage() {
  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Thread List */}
      <div className="flex-1 flex flex-col border-r border-border min-w-0">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-display font-bold text-foreground">Communications</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Inbox &amp; AI-assisted email management</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map((thread, i) => (
            <motion.div
              key={thread.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`p-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/20 ${
                thread.unread ? "bg-primary/[0.03]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {thread.priority === "high" && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                  <span className={`text-sm ${thread.unread ? "font-semibold text-foreground" : "text-foreground"}`}>
                    {thread.from}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">{thread.time}</span>
              </div>
              <div className={`text-sm mb-1 ${thread.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {thread.subject}
              </div>
              <p className="text-xs text-muted-foreground truncate">{thread.preview}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail / Actions Panel */}
      <div className="hidden lg:flex w-96 flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Re: Q2 Partnership Proposal</h3>
          <p className="text-xs text-muted-foreground mt-0.5">From Sarah Chen · 10:32 AM</p>
        </div>
        <div className="flex-1 p-4">
          <div className="glass-panel p-4 text-sm text-muted-foreground leading-relaxed mb-6">
            Thanks for sending over the revised terms. I've reviewed the pricing structure and have a few suggestions regarding the volume discount tiers. Can we schedule a call this week to discuss?
          </div>

          <h4 className="text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">AI Actions</h4>
          <div className="space-y-2">
            {actions.map((action) => (
              <button key={action.label} className="w-full command-btn flex items-center gap-2 justify-start text-xs">
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            ))}
          </div>

          <div className="mt-6 p-3 rounded-md bg-primary/5 border border-primary/15">
            <div className="flex items-center gap-2 text-xs text-primary font-medium mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              AI Suggestion
            </div>
            <p className="text-xs text-muted-foreground">
              Schedule a call this week to discuss volume discount tiers. Flag for follow-up by Thursday.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
