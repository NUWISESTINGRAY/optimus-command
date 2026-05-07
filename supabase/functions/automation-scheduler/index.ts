import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Minimal cron matcher: supports * , */N , N , N-M for the 5 standard fields
function matchField(expr: string, value: number, min: number, max: number): boolean {
  if (expr === "*") return true;
  for (const part of expr.split(",")) {
    if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2)); if (step > 0 && (value - min) % step === 0) return true;
    } else if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number); if (value >= a && value <= b) return true;
    } else {
      if (parseInt(part) === value) return true;
    }
  }
  return false;
}
function cronMatches(expr: string, d: Date): boolean {
  const parts = expr.trim().split(/\s+/); if (parts.length !== 5) return false;
  const [mi, hr, dm, mo, dw] = parts;
  return matchField(mi, d.getUTCMinutes(), 0, 59)
    && matchField(hr, d.getUTCHours(), 0, 23)
    && matchField(dm, d.getUTCDate(), 1, 31)
    && matchField(mo, d.getUTCMonth() + 1, 1, 12)
    && matchField(dw, d.getUTCDay(), 0, 6);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: wfs } = await supabase.from("automation_workflows")
    .select("id, schedule_cron, active, trigger_type")
    .eq("active", true).eq("trigger_type", "schedule");

  const now = new Date();
  const fired: string[] = [];
  for (const wf of (wfs || [])) {
    if (!wf.schedule_cron) continue;
    if (!cronMatches(wf.schedule_cron, now)) continue;
    fired.push(wf.id);
    fetch(`${supabaseUrl}/functions/v1/automation-run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ workflow_id: wf.id, trigger_source: "schedule", input: { now: now.toISOString() } }),
    }).catch((e) => console.error("schedule fire failed:", e));
  }

  return new Response(JSON.stringify({ fired, count: fired.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});