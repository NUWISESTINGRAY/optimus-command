import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

// Dispatch a single agent action. Returns { ok, result?, error? }.
async function dispatch(action_type: string, payload: any, userId: string, admin: any) {
  switch (action_type) {
    case "create_task": {
      const { data, error } = await admin.from("tasks").insert({
        user_id: userId,
        title: payload.title ?? "Untitled task",
        description: payload.description ?? null,
        status: "todo",
        priority: payload.priority ?? "medium",
        due_date: payload.due ?? payload.due_date ?? null,
        assignee: payload.assignee ?? null,
      }).select().single();
      if (error) throw error;
      return { task_id: data.id };
    }
    case "run_workflow": {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/atlas-run-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ workflow_id: payload.workflow_id, input: payload.input ?? {}, source: "agent_action" }),
      });
      return await r.json();
    }
    case "n8n": {
      if (!LOVABLE_API_KEY) throw new Error("n8n gateway not configured");
      const r = await fetch(`https://connector-gateway.lovable.dev/n8n/workflows/${payload.workflow_id}/execute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload.input ?? {}),
      });
      return await r.json();
    }
    case "send_email": {
      // Stub — wire to a real email connector when added. For now log and return.
      console.log("send_email proposed (not yet wired):", payload);
      return { simulated: true, note: "Email send not yet connected to a provider." };
    }
    case "schedule_meeting": {
      if (!LOVABLE_API_KEY) throw new Error("Google Calendar not configured");
      const r = await fetch(`https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: payload.title ?? "Meeting",
          description: payload.description ?? "",
          start: { dateTime: payload.start, timeZone: payload.timezone ?? "UTC" },
          end: { dateTime: payload.end, timeZone: payload.timezone ?? "UTC" },
          attendees: (payload.attendees ?? []).map((email: string) => ({ email })),
        }),
      });
      return await r.json();
    }
    default:
      throw new Error(`Unknown action_type: ${action_type}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();
    const { approval_id } = body;
    if (!approval_id) throw new Error("approval_id required");

    const { data: approval, error: aerr } = await admin.from("approvals").select("*").eq("id", approval_id).single();
    if (aerr || !approval) throw new Error("approval not found");
    if (approval.status !== "pending") {
      return new Response(JSON.stringify({ ok: false, error: `already ${approval.status}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const meta = approval.payload_json ?? {};
    const action_type = meta.action_type;
    const payload = meta.action_payload ?? {};
    if (!action_type) throw new Error("approval missing action_type");

    let result: any = null;
    let execError: string | null = null;
    try {
      result = await dispatch(action_type, payload, approval.user_id, admin);
    } catch (e) {
      execError = e instanceof Error ? e.message : String(e);
    }

    await admin.from("approvals").update({
      status: execError ? "rejected" : "approved",
      decided_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
      payload_json: { ...meta, execution_result: result, execution_error: execError },
    }).eq("id", approval_id);

    // Audit
    await admin.from("agent_runs").insert({
      user_id: approval.user_id,
      agent_type: meta.agent_codename ?? "system",
      task_type: `action:${action_type}`,
      status: execError ? "failed" : "completed",
      input_json: payload,
      output_json: result ?? {},
      error_message: execError,
      completed_at: new Date().toISOString(),
    });

    // Telegram notify if the approval originated there
    if (meta.telegram_chat_id && TELEGRAM_API_KEY && LOVABLE_API_KEY) {
      const text = execError
        ? `❌ Action *${action_type}* failed: ${execError}`
        : `✅ Action *${action_type}* executed.`;
      try {
        await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TELEGRAM_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chat_id: meta.telegram_chat_id, text, parse_mode: "Markdown" }),
        });
      } catch { /* best effort */ }
    }

    return new Response(JSON.stringify({ ok: !execError, result, error: execError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});