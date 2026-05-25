import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: topics } = await supabase
      .from("knowledge_topics")
      .select("id, last_run_at, user_id")
      .eq("active", true);

    const dueIds: string[] = [];
    const cutoff = Date.now() - 22 * 60 * 60 * 1000; // ~daily
    for (const t of (topics ?? [])) {
      if (!t.last_run_at || new Date(t.last_run_at).getTime() < cutoff) {
        dueIds.push(t.id);
      }
    }

    const results: any[] = [];
    for (const id of dueIds) {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/knowledge-ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ kind: "research", topic_id: id }),
        });
        results.push({ id, ok: r.ok });
      } catch (e) {
        results.push({ id, ok: false, error: String(e) });
      }
    }
    return new Response(JSON.stringify({ ok: true, processed: dueIds.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
