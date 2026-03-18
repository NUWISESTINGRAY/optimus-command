import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Sparkles,
  Presentation,
  MoreHorizontal,
} from "lucide-react";

const docs = [
  { id: "1", title: "Q1 Executive Summary", type: "Report", status: "Final", created: "Mar 15", pages: 12 },
  { id: "2", title: "Marketing Strategy Memo", type: "Memo", status: "Draft", created: "Mar 14", pages: 4 },
  { id: "3", title: "Vendor Evaluation — Cloud Services", type: "Analysis", status: "In Review", created: "Mar 12", pages: 18 },
  { id: "4", title: "Employee Handbook v3.2", type: "SOP", status: "Final", created: "Mar 10", pages: 45 },
  { id: "5", title: "Investor Pitch Deck — Series B", type: "Presentation", status: "Draft", created: "Mar 8", pages: 22 },
  { id: "6", title: "Competitive Analysis — Q1 2026", type: "White Paper", status: "Final", created: "Mar 5", pages: 31 },
];

const statusStyle: Record<string, string> = {
  "Final": "bg-emerald-500/10 text-emerald-400",
  "Draft": "bg-amber-500/10 text-amber-400",
  "In Review": "bg-primary/10 text-primary",
};

export default function Documents() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">Generated reports, memos, presentations, and outputs.</p>
        </div>
        <button className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Document
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 glass-panel px-4 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Search documents..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
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
              <th className="text-left p-4 font-medium">Document</th>
              <th className="text-left p-4 font-medium">Type</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Pages</th>
              <th className="text-left p-4 font-medium">Created</th>
              <th className="text-left p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, i) => (
              <motion.tr
                key={doc.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground font-medium">{doc.title}</span>
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">{doc.type}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${statusStyle[doc.status]}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">{doc.pages}</td>
                <td className="p-4 text-sm text-muted-foreground">{doc.created}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
