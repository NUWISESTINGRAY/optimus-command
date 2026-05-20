import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ForceGraph2D from "react-force-graph-2d";

export default function GraphView() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: pages } = await supabase
        .from("jwba_pages")
        .select("id,title")
        .eq("tenant_id", user.id);
      const { data: agentBlocks } = await supabase
        .from("jwba_blocks")
        .select("id,content,agent_codename,page_id")
        .not("agent_codename", "is", null);
      const { data: refs } = await supabase
        .from("jwba_block_refs")
        .select("source_block_id,target_page_id");
      const nodes: any[] = [
        ...(pages ?? []).map((p) => ({ id: p.id, name: p.title, val: 8, type: "page" })),
        ...(agentBlocks ?? []).map((b: any) => ({
          id: b.id,
          name: (b.content || "").slice(0, 40) || "agent",
          val: 3,
          type: "block",
          pageId: b.page_id,
        })),
      ];
      const ids = new Set(nodes.map((n) => n.id));
      const links = (refs ?? [])
        .filter((r) => ids.has(r.source_block_id) && r.target_page_id && ids.has(r.target_page_id))
        .map((r) => ({ source: r.source_block_id, target: r.target_page_id }));
      setData({ nodes, links });
    })();
  }, [user]);

  return (
    <div className="h-[calc(100vh-3rem)] w-full">
      <ForceGraph2D
        graphData={data}
        nodeLabel="name"
        nodeRelSize={4}
        backgroundColor="hsl(222 47% 2%)"
        linkColor={() => "rgba(120,120,140,0.3)"}
        nodeColor={(n: any) => (n.type === "page" ? "#38bdf8" : "#a78bfa")}
        onNodeClick={(n: any) => {
          if (n.type === "page") nav(`/workspace/page/${n.id}`);
          else if (n.pageId) nav(`/workspace/page/${n.pageId}`);
        }}
      />
    </div>
  );
}