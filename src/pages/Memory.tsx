import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  FileText,
  Book,
  Shield,
  Briefcase,
  Tag,
  ToggleRight,
  MoreHorizontal,
  Brain,
} from "lucide-react";

const documents = [
  { id: "1", title: "Brand Voice Guidelines", type: "SOP", tags: ["branding", "marketing"], aiEnabled: true, updated: "2 days ago" },
  { id: "2", title: "Sales Playbook — Enterprise", type: "Playbook", tags: ["sales", "enterprise"], aiEnabled: true, updated: "1 week ago" },
  { id: "3", title: "Employee Onboarding Checklist", type: "SOP", tags: ["hr", "onboarding"], aiEnabled: false, updated: "3 days ago" },
  { id: "4", title: "Q1 Market Research Report", type: "Report", tags: ["research", "market"], aiEnabled: true, updated: "5 days ago" },
  { id: "5", title: "Legal Compliance Policy", type: "Policy", tags: ["legal", "compliance"], aiEnabled: true, updated: "2 weeks ago" },
  { id: "6", title: "Product Roadmap 2026", type: "Strategy", tags: ["product", "strategy"], aiEnabled: true, updated: "1 day ago" },
];

const typeIcon: Record<string, any> = {
  SOP: Book,
  Playbook: Briefcase,
  Report: FileText,
  Policy: Shield,
  Strategy: FileText,
};

export default function Memory() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Knowledge Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage documents, SOPs, and AI memory context.</p>
        </div>
        <button className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 glass-panel px-4 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search knowledge vault..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-md border border-border">
          <Filter className="w-3 h-3" />
          Filter
        </button>
      </div>

      {/* Documents Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {documents.map((doc, i) => {
          const Icon = typeIcon[doc.type] || FileText;
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel-hover p-5 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{doc.title}</h3>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{doc.type}</span>
                  </div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {doc.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-secondary text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Updated {doc.updated}</span>
                <div className="flex items-center gap-1.5">
                  <Brain className={`w-3 h-3 ${doc.aiEnabled ? "text-primary" : "text-muted-foreground/40"}`} />
                  <span className={doc.aiEnabled ? "text-primary" : ""}>
                    {doc.aiEnabled ? "AI Active" : "AI Off"}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
