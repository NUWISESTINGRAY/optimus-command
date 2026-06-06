import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { document_id, decision, user_id } = await req.json();
    if (!document_id || !decision) throw new Error("document_id and decision required");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl) {
      console.error("Edge function error: SUPABASE_URL is missing.");
      return new Response(JSON.stringify({ error: "Server configuration error: Missing SUPABASE_URL" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!serviceKey) {
      console.error("Edge function error: SUPABASE_SERVICE_ROLE_KEY is missing.");
      return new Response(JSON.stringify({ error: "Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const status = decision === "keep" ? "active" : "archived";
    const q = supabase.from("documents").update({ status }).eq("id", document_id);
    if (user_id) q.eq("user_id", user_id);
    const { error } = await q;
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
