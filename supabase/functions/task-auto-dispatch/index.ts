import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL) throw new Error("Server configuration error: Missing SUPABASE_URL");
if (!SERVICE_KEY) throw new Error("Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

const MODE_PROMPTS: Record<string, string> = {
  COO: "You are COO. Produce concrete operational plan, SOPs, KPIs.",
  CMO: "You are CMO. Produce marketing/GTM plan, copy, channels.",
  CFO: "You are CFO. Produce numbers, pricing, scenarios.",
  CTO: "You are CTO. Produce architecture, integration, implementation steps.",
  CRO: "You are CRO. Produce sales/pipeline plan.",
  HR: "You are CHRO. Produce people/hiring/culture plan.",
  Research: "You are Chief Research Officer. Produce structured, sourced research.",
  "Executive Assistant": "You are EA. Produce summary, draft, action items.",
  "Chief of Staff": "You are Chief of Staff. Produce cross-functional plan.",
};

function classify(text: string): string {
  const l = text.toLowerCase();
  if (/budget|revenue|cost|financ|pricing|forecast|margin/.test(l)) return "CFO";
  if (/market|campaign|brand|audience|content|seo|gtm|advertis/.test(l)) return "CMO";
  if (/architect|api|deploy|code|engineer|infra|tech|system/.test(l)) return "CTO";
  if (/pipeline|deal|sales|quota|prospect/.test(l)) return "CRO";
  if (/hire|culture|perform|compen|training|employee|team/.test(l)) return "HR";
  if (/research|analyz|study|report|data|compare|investigate/.test(l)) return "Research";
  if (/schedule|draft|reply|follow.?up|summari[sz]e|remind|brief|email/.test(l)) return "Executive Assistant";
  if (/coordinate|strategic|stakeholder|initiative|align/.test(l)) return "Chief of Staff";
  return "COO";
}

// Resolve the lead persona for a given execution mode from jwba_agents.
// Falls back to the generic one-line mode prompt if no persona is wired up.
async function resolveAgent(admin: any, mode: string) {
  const { data } = await admin
    .from("jwba_agents")
    .select("codename, display_name, spec")
    .eq("default_mode", mode)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

function personaPrompt(agent: any, mode: string): string {
  const spec = agent?.spec ?? {};
  const role = spec.role ?? mode;
  const tagline = spec.tagline ?? "";
  const expertise = Array.isArray(spec.expertise) ? spec.expertise.join(", ") : "";
  const resp = Array.isArray(spec.responsibilities) ? spec.responsibilities.join(", ") : "";
  return `You are ${agent?.display_name ?? mode} (${role}). ${tagline}\nExpertise: ${expertise}.\nResponsibilities: ${resp}.\nStay in character. Produce the deliverable directly.`;
}

async function runOne(admin: any, task: any) {
  const mode = classify(`${task.title}\n${task.description ?? ""}`);
  const agent = await resolveAgent(admin, mode);
  const sys = agent ? personaPrompt(agent, mode) : (MODE_PROMPTS[mode] ?? MODE_PROMPTS["Executive Assistant"]);
  const displayName = agent?.display_name ?? mode;
  const codename = agent?.codename ?? null;
  const user = `Task: ${task.title}\n\nDetails: ${task.description ?? "(none)"}\n\nDeliver the result directly — no preamble. Keep it under 400 words, structured with short headings or bullets.`;

  await admin.from("tasks").update({ status: "in_progress" }).eq("id", task.id);

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    await admin.from("tasks").update({ status: "todo" }).eq("id", task.id);
    await admin.from("agent_runs").insert({
      user_id: task.user_id, agent_type: codename ?? mode, task_type: "auto_task", task_id: task.id,
      agent_mode: mode, status: "failed", input_json: { task_id: task.id }, error_message: err,
      completed_at: new Date().toISOString(),
    });
    return { ok: false, error: err };
  }

  const data = await r.json();
  const answer = data.choices?.[0]?.message?.content ?? "";

  const newDesc = `${task.description ? task.description + "\n\n" : ""}---\n🤖 ${displayName} delivered:\n\n${answer}`;
  await admin.from("tasks").update({
    status: "done", description: newDesc, assignee: displayName,
  }).eq("id", task.id);

  // Save output as a Document in the Knowledge Vault
  await admin.from("documents").insert({
    user_id: task.user_id,
    project_id: task.project_id ?? null,
    title: task.title,
    summary: answer.slice(0, 280),
    content: answer,
    source: "agent",
    doc_type: "report",
    status: "final",
    auto: true,
    tags: ["task-output", `mode:${mode}`, ...(codename ? [`agent:${codename}`] : [])],
  });

  await admin.from("agent_runs").insert({
    user_id: task.user_id, agent_type: codename ?? mode, task_type: "auto_task", task_id: task.id,
    agent_mode: mode, status: "completed",
    input_json: { title: task.title, description: task.description },
    output_json: { answer }, completed_at: new Date().toISOString(),
  });

  await admin.from("notifications").insert({
    user_id: task.user_id, type: "task", title: `✅ ${displayName} completed: ${task.title}`,
    body: answer.slice(0, 240), link: `/tasks`,
  });

  // Telegram notify
  if (TELEGRAM_API_KEY) {
    const { data: tg } = await admin.from("telegram_connections")
      .select("chat_id").eq("user_id", task.user_id).eq("is_active", true).maybeSingle();
    if (tg?.chat_id) {
      try {
        await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TELEGRAM_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: tg.chat_id,
            text: `✅ *${displayName}* completed: *${task.title}*\n\n${answer.slice(0, 800)}`,
            parse_mode: "Markdown",
          }),
        });
      } catch { /* best effort */ }
    }
  }

  return { ok: true, mode, agent: codename, task_id: task.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const { task_id, sweep } = body as { task_id?: string; sweep?: boolean };

    let tasks: any[] = [];
    if (task_id) {
      const { data } = await admin.from("tasks").select("*").eq("id", task_id).eq("status", "todo").limit(1);
      tasks = data ?? [];
    } else if (sweep) {
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { data } = await admin.from("tasks").select("*").eq("status", "todo").lt("created_at", cutoff).limit(20);
      tasks = data ?? [];
    } else {
      return new Response(JSON.stringify({ error: "task_id or sweep required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = [];
    for (const t of tasks) {
      try { results.push(await runOne(admin, t)); }
      catch (e) { results.push({ ok: false, task_id: t.id, error: e instanceof Error ? e.message : "err" }); }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "err" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
