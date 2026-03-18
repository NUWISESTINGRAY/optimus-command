import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Paperclip,
  Mic,
  Sparkles,
  FileText,
  CheckSquare,
  ExternalLink,
  Bot,
  User,
  ChevronRight,
} from "lucide-react";

const modes = [
  "Auto", "COO", "CMO", "CFO", "CTO", "CRO", "HR", "Research", "Executive Assistant", "Chief of Staff"
];

const sampleMessages = [
  {
    role: "user",
    content: "Summarize the Q1 revenue performance and highlight any areas of concern.",
  },
  {
    role: "assistant",
    mode: "CFO",
    content: `**Q1 Revenue Summary**

Total revenue came in at **$4.2M**, representing a **12% increase** quarter-over-quarter. Key highlights:

• **SaaS recurring revenue** grew 18% to $2.8M, driven by enterprise upsells
• **Professional services** declined 5% to $890K due to delayed project kick-offs  
• **New customer acquisition** was below target — 14 new accounts vs. 20 projected

**Areas of Concern:**
1. Customer churn rate increased to 4.2% (up from 3.1% in Q4)
2. Average deal size decreased 8% in the SMB segment
3. Two enterprise renewals ($340K combined) are at risk — flagged for executive review`,
    actions: [
      { label: "View full report", icon: FileText },
      { label: "Create action items", icon: CheckSquare },
    ],
    sources: ["Q1 Financial Report.xlsx", "Revenue Dashboard", "CRM Pipeline Data"],
  },
];

const suggestions = [
  "Draft a board update email",
  "Create a project plan for Q2 hiring",
  "Analyze competitor pricing strategy",
  "Summarize yesterday's meeting notes",
];

export default function Chat() {
  const [activeMode, setActiveMode] = useState("Auto");
  const [input, setInput] = useState("");

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mode Selector */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-2 overflow-x-auto">
          {modes.map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                activeMode === mode
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {sampleMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-2xl ${msg.role === "user" ? "order-first" : ""}`}>
                {msg.role === "assistant" && msg.mode && (
                  <div className="text-[10px] text-primary font-medium tracking-wider uppercase mb-1.5">
                    OPTIMUS · {msg.mode} Mode
                  </div>
                )}
                <div className={`rounded-lg p-4 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 text-foreground"
                    : "glass-panel text-foreground"
                }`}>
                  <div className="whitespace-pre-line">{msg.content}</div>
                  {msg.role === "assistant" && msg.actions && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                      {msg.actions.map((action, j) => (
                        <button key={j} className="command-btn flex items-center gap-1.5 text-xs">
                          <action.icon className="w-3 h-3" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="px-6 pb-2">
          <div className="flex gap-2 flex-wrap">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-xs px-3 py-1.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-border/50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 glass-panel p-2 rounded-lg">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Optimus anything..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      <div className="hidden lg:flex w-80 border-l border-border flex-col bg-background/50">
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-medium text-muted-foreground tracking-wider uppercase">Intelligence Panel</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Sources */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Cited Sources
            </h4>
            <div className="space-y-2">
              {(sampleMessages[1] as any).sources?.map((src: string, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border/50">
                  <span className="text-xs text-foreground">{src}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>

          {/* Generated Tasks */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5" />
              Suggested Actions
            </h4>
            <div className="space-y-2">
              {["Review churn analysis", "Schedule renewal calls", "Update revenue forecast"].map((task, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/50 text-xs text-foreground">
                  <ChevronRight className="w-3 h-3 text-primary" />
                  {task}
                </div>
              ))}
            </div>
          </div>

          {/* Active Mode */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Active Mode
            </h4>
            <div className="p-3 rounded-md bg-primary/5 border border-primary/15">
              <div className="text-sm font-medium text-primary">{activeMode}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Optimized for financial analysis, reporting, and executive decision support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
