import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // path: /automation-webhook/<token>
  const parts = url.pathname.split("/").filter(Boolean);
  const token = parts[parts.length - 1];
  if (!token) return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: wf } = await supabase.from("automation_workflows").select("id, active, user_id").eq("webhook_token", token).maybeSingle();
  if (!wf) return new Response(JSON.stringify({ error: "Unknown webhook" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!wf.active) return new Response(JSON.stringify({ error: "Workflow inactive" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const queryParams = Object.fromEntries(url.searchParams.entries());

  const r = await fetch(`${supabaseUrl}/functions/v1/automation-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({ workflow_id: wf.id, trigger_source: "webhook", input: { body, query: queryParams, headers: Object.fromEntries(req.headers.entries()) } }),
  });
  const result = await r.json();
  return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});