import { Send, Users } from "lucide-react";

export function RightSidebar({ collapsed, pageId }: { collapsed: boolean; pageId?: string }) {
  if (collapsed) return null;
  return (
    <aside className="w-72 border-l border-border bg-sidebar/40 overflow-y-auto p-4 space-y-6">
      <section>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
          <Users className="w-3 h-3" /> Active agents
        </div>
        <p className="text-[12px] text-muted-foreground italic">Idle</p>
      </section>

      <section>
        <a
          href="https://t.me/jwba_team_bot"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition"
        >
          <Send className="w-4 h-4" /> Open in Telegram
        </a>
      </section>
    </aside>
  );
}