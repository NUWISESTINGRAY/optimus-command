import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Row {
  id: string;
  content: string;
  page_id: string;
  page_title: string;
}

export function LinkedReferences({ pageId }: { pageId: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data: refs } = await supabase
        .from("jwba_block_refs")
        .select("source_block_id")
        .eq("target_page_id", pageId);
      const ids = (refs ?? []).map((r) => r.source_block_id);
      if (!ids.length) { setRows([]); return; }
      const { data: blocks } = await supabase
        .from("jwba_blocks")
        .select("id, content, page_id, jwba_pages(title)")
        .in("id", ids);
      setRows(
        (blocks ?? []).map((b: any) => ({
          id: b.id,
          content: b.content,
          page_id: b.page_id,
          page_title: b.jwba_pages?.title ?? "Untitled",
        })),
      );
    })();
  }, [pageId]);

  if (!rows.length) return null;

  return (
    <div className="mt-16 border-t border-border pt-6">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
        Linked references ({rows.length})
      </h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <Link
            key={r.id}
            to={`/workspace/page/${r.page_id}`}
            className="block p-3 rounded-md bg-secondary/30 hover:bg-secondary/60 border border-border"
          >
            <div className="text-[11px] text-muted-foreground mb-1">{r.page_title}</div>
            <div className="text-sm font-mono text-foreground/90 truncate">{r.content}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}