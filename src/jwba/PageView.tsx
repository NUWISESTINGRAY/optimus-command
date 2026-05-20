import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Block, BlockRow } from "./Block";
import { nextSortOrder, syncBlockRefs } from "./lib/api";
import { LinkedReferences } from "./LinkedReferences";

interface Props { pageId: string }

export function PageView({ pageId }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const focusMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const debounce = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    (async () => {
      const { data: page } = await supabase.from("jwba_pages").select("*").eq("id", pageId).single();
      if (page) setTitle(page.title);
      const { data: bs } = await supabase
        .from("jwba_blocks")
        .select("*")
        .eq("page_id", pageId)
        .order("sort_order", { ascending: true });
      setBlocks((bs ?? []) as BlockRow[]);
    })();

    const ch = supabase
      .channel(`jwba-page-${pageId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jwba_blocks", filter: `page_id=eq.${pageId}` }, (payload) => {
        setBlocks((prev) => {
          if (payload.eventType === "INSERT") {
            const nb = payload.new as BlockRow;
            if (prev.find((b) => b.id === nb.id)) return prev;
            return [...prev, nb].sort((a, b) => a.sort_order - b.sort_order);
          }
          if (payload.eventType === "UPDATE") {
            const nb = payload.new as BlockRow;
            return prev.map((b) => (b.id === nb.id ? { ...b, ...nb } : b)).sort((a, b) => a.sort_order - b.sort_order);
          }
          if (payload.eventType === "DELETE") {
            return prev.filter((b) => b.id !== (payload.old as any).id);
          }
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pageId]);

  const tree = useMemo(() => {
    const byParent = new Map<string | null, BlockRow[]>();
    for (const b of blocks) {
      const k = b.parent_id;
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k)!.push(b);
    }
    for (const arr of byParent.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    const flat: { block: BlockRow; depth: number }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const b of byParent.get(parent) ?? []) {
        flat.push({ block: b, depth });
        walk(b.id, depth + 1);
      }
    };
    walk(null, 0);
    return flat;
  }, [blocks]);

  const saveContent = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
    const t = debounce.current.get(id);
    if (t) window.clearTimeout(t);
    const handle = window.setTimeout(async () => {
      await supabase.from("jwba_blocks").update({ content }).eq("id", id);
      if (user) await syncBlockRefs(id, content, user.id);
    }, 350);
    debounce.current.set(id, handle);
  };

  const insertSibling = async (afterId: string) => {
    const cur = blocks.find((b) => b.id === afterId);
    if (!cur || !user) return;
    const siblings = blocks.filter((b) => b.parent_id === cur.parent_id).map((b) => b.sort_order);
    const order = nextSortOrder(siblings, cur.sort_order);
    const { data } = await supabase
      .from("jwba_blocks")
      .insert({ page_id: pageId, parent_id: cur.parent_id, sort_order: order, content: "", created_by: user.id })
      .select()
      .single();
    if (data) {
      setBlocks((p) => [...p, data as BlockRow].sort((a, b) => a.sort_order - b.sort_order));
      setTimeout(() => focusMap.current.get((data as BlockRow).id)?.focus(), 50);
    }
  };

  const indent = async (id: string) => {
    const cur = blocks.find((b) => b.id === id);
    if (!cur) return;
    const siblings = blocks.filter((b) => b.parent_id === cur.parent_id && b.sort_order < cur.sort_order).sort((a, b) => a.sort_order - b.sort_order);
    const prev = siblings[siblings.length - 1];
    if (!prev) return;
    await supabase.from("jwba_blocks").update({ parent_id: prev.id }).eq("id", id);
  };

  const outdent = async (id: string) => {
    const cur = blocks.find((b) => b.id === id);
    if (!cur || !cur.parent_id) return;
    const parent = blocks.find((b) => b.id === cur.parent_id);
    if (!parent) return;
    await supabase.from("jwba_blocks").update({ parent_id: parent.parent_id }).eq("id", id);
  };

  const remove = async (id: string) => {
    await supabase.from("jwba_blocks").delete().eq("id", id);
  };

  const focusRel = (id: string, dir: -1 | 1) => {
    const idx = tree.findIndex((t) => t.block.id === id);
    const target = tree[idx + dir];
    if (target) focusMap.current.get(target.block.id)?.focus();
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    await supabase.from("jwba_pages").update({ title }).eq("id", pageId);
  };

  const addFirstBlock = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("jwba_blocks")
      .insert({ page_id: pageId, sort_order: 1, content: "", created_by: user.id })
      .select()
      .single();
    if (data) setTimeout(() => focusMap.current.get((data as BlockRow).id)?.focus(), 50);
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {editingTitle ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && saveTitle()}
          className="w-full text-3xl font-display font-bold bg-transparent outline-none border-b border-border pb-1"
        />
      ) : (
        <h1
          onClick={() => setEditingTitle(true)}
          className="text-3xl font-display font-bold cursor-text hover:bg-secondary/30 -mx-2 px-2 rounded"
        >
          {title || "Untitled"}
        </h1>
      )}

      <div className="mt-8 space-y-0">
        {tree.length === 0 && (
          <button onClick={addFirstBlock} className="text-sm text-muted-foreground hover:text-foreground py-2">
            + Click to start writing
          </button>
        )}
        {tree.map(({ block, depth }) => (
          <Block
            key={block.id}
            block={block}
            depth={depth}
            onChange={saveContent}
            onEnter={insertSibling}
            onIndent={indent}
            onOutdent={outdent}
            onDelete={remove}
            onFocusPrev={(id) => focusRel(id, -1)}
            onFocusNext={(id) => focusRel(id, 1)}
            focusRef={(el) => {
              if (el) focusMap.current.set(block.id, el);
              else focusMap.current.delete(block.id);
            }}
          />
        ))}
      </div>

      <LinkedReferences pageId={pageId} />
    </div>
  );
}