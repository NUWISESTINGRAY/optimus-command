import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getPath(obj: any, path: string): any {
  return path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
}
function interp(value: any, ctx: any): any {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([\w.\[\]]+)\s*\}\}/g, (_, p) => {
      const v = getPath(ctx, p.trim());
      return v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => interp(v, ctx));
  if (value && typeof value === "object") {
    const o: any = {}; for (const k of Object.keys(value)) o[k] = interp(value[k], ctx); return o;
  }
  return value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth (optional - public webhook calls service-side)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const u = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data } = await u.auth.getUser();
      userId = data.user?.id || null;
    }

    const { workflow_id, input = {}, trigger_source = "manual" } = await req.json();
    if (!workflow_id) return new Response(JSON.stringify({ error: "workflow_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: wf } = await supabase.from("automation_workflows").select("*").eq("id", workflow_id).maybeSingle();
    if (!wf) return new Response(JSON.stringify({ error: "Workflow not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ data: nodes }, { data: edges }] = await Promise.all([
      supabase.from("automation_nodes").select("*").eq("workflow_id", workflow_id),
      supabase.from("automation_edges").select("*").eq("workflow_id", workflow_id),
    ]);

    if (!nodes || nodes.length === 0) return new Response(JSON.stringify({ error: "No nodes" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Find trigger node
    const triggerNode = nodes.find((n: any) => n.type.startsWith("trigger."));
    if (!triggerNode) return new Response(JSON.stringify({ error: "No trigger node" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create run
    const { data: run } = await supabase.from("automation_runs").insert({
      workflow_id, status: "running", trigger_source, input_json: input,
    }).select("id").single();
    const runId = run!.id;

    // Build adjacency
    const outgoing: Record<string, any[]> = {};
    for (const e of (edges || [])) {
      (outgoing[e.source_node_key] ||= []).push(e);
    }
    const nodeByKey: Record<string, any> = {};
    for (const n of nodes) nodeByKey[n.node_key] = n;

    // Execution context
    const ctx: any = { trigger: input, nodes: {} };
    const nodeStatuses: Record<string, string> = {};
    let runStatus: "completed" | "failed" | "paused" = "completed";
    let runError: string | null = null;

    async function logNode(nodeKey: string, status: string, inputJson: any, outputJson: any, error?: string) {
      await supabase.from("automation_node_runs").insert({
        run_id: runId, workflow_id, node_key: nodeKey, status,
        input_json: inputJson || {}, output_json: outputJson || {}, error: error || null,
        completed_at: new Date().toISOString(),
      });
    }

    async function executeNode(node: any, nodeInput: any): Promise<{ output: any; nextHandle?: string } | null> {
      const cfg = interp(node.config_json || {}, { ...ctx, input: nodeInput });
      const t = node.type;

      if (t.startsWith("trigger.")) return { output: nodeInput };

      if (t === "ai.chat") {
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: cfg.model || "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: cfg.system || "" },
              { role: "user", content: cfg.prompt || JSON.stringify(nodeInput) },
            ],
          }),
        });
        if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
        const j = await r.json();
        return { output: { content: j.choices?.[0]?.message?.content || "", model: cfg.model } };
      }

      if (t === "action.http") {
        const headers = cfg.headers && typeof cfg.headers === "object" ? cfg.headers : {};
        const init: any = { method: cfg.method || "GET", headers: { "Content-Type": "application/json", ...headers } };
        if (cfg.method && cfg.method !== "GET" && cfg.body) init.body = typeof cfg.body === "string" ? cfg.body : JSON.stringify(cfg.body);
        const r = await fetch(cfg.url, init);
        const text = await r.text();
        let body: any = text; try { body = JSON.parse(text); } catch {}
        return { output: { status: r.status, body } };
      }

      if (t === "action.telegram_send") {
        await fetch(`${supabaseUrl}/functions/v1/telegram-send-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ user_id: wf.user_id, message: cfg.message || "" }),
        });
        return { output: { sent: true, message: cfg.message } };
      }

      if (t === "action.create_task") {
        const { data } = await supabase.from("tasks").insert({
          user_id: wf.user_id, title: cfg.title || "Automation task",
          description: cfg.description || "", priority: cfg.priority || "medium", status: "todo",
        }).select().single();
        return { output: { task: data } };
      }

      if (t === "action.create_document") {
        const { data } = await supabase.from("documents").insert({
          user_id: wf.user_id, title: cfg.title || "Automation doc",
          content: cfg.contentExpr || "", doc_type: "document", status: "draft",
        }).select().single();
        return { output: { document: data } };
      }

      if (t === "action.notify") {
        const { data } = await supabase.from("notifications").insert({
          user_id: wf.user_id, title: cfg.title || "Automation",
          message: cfg.message || "", type: "info", channel: "app",
        }).select().single();
        return { output: { notification: data } };
      }

      if (t === "action.email") {
        return { output: { skipped: true, reason: "Email provider not configured", to: cfg.to } };
      }

      if (t === "action.n8n") {
        return { output: { skipped: true, reason: "n8n REST integration not configured" } };
      }

      if (t === "logic.if") {
        const { left, op, right } = cfg;
        const ln = Number(left), rn = Number(right);
        let res = false;
        switch (op) {
          case "eq": res = String(left) === String(right); break;
          case "neq": res = String(left) !== String(right); break;
          case "contains": res = String(left).includes(String(right)); break;
          case "gt": res = ln > rn; break;
          case "gte": res = ln >= rn; break;
          case "lt": res = ln < rn; break;
          case "lte": res = ln <= rn; break;
        }
        return { output: { result: res, left, right }, nextHandle: res ? "true" : "false" };
      }

      if (t === "logic.switch") {
        const v = String(cfg.expr ?? "");
        let handle = "default";
        if (v === String(cfg.a ?? "")) handle = "a";
        else if (v === String(cfg.b ?? "")) handle = "b";
        else if (v === String(cfg.c ?? "")) handle = "c";
        return { output: { matched: handle }, nextHandle: handle };
      }

      if (t === "logic.transform") {
        try {
          const fn = new Function("input", "ctx", cfg.code || "return input;");
          return { output: fn(nodeInput, ctx) };
        } catch (e) { throw new Error("Transform error: " + (e as Error).message); }
      }

      if (t === "logic.loop") {
        const items = Array.isArray(cfg.itemsExpr) ? cfg.itemsExpr : [];
        return { output: { items, count: items.length } };
      }

      if (t === "logic.wait") {
        const sec = Math.min(Number(cfg.seconds || 0), 30);
        if (sec > 0) await new Promise((r) => setTimeout(r, sec * 1000));
        return { output: { waited: sec } };
      }

      if (t === "logic.approval") {
        await supabase.from("approvals").insert({
          user_id: wf.user_id, source_type: "automation", source_id: runId,
          title: cfg.title || "Approval required", summary: cfg.summary || "",
          risk_level: cfg.risk_level || "medium", status: "pending",
          payload_json: { workflow_id, run_id: runId, node_key: node.node_key },
        });
        return { output: { paused: true } };
      }

      throw new Error(`Unknown node type: ${t}`);
    }

    // BFS execution starting from trigger
    const queue: { key: string; input: any }[] = [{ key: triggerNode.node_key, input }];
    const visited = new Set<string>();
    let stepsExecuted = 0;

    while (queue.length > 0) {
      const { key, input: nodeInput } = queue.shift()!;
      if (visited.has(key)) continue;
      visited.add(key);
      const node = nodeByKey[key];
      if (!node) continue;

      try {
        const result = await executeNode(node, nodeInput);
        stepsExecuted++;
        if (!result) { nodeStatuses[key] = "skipped"; continue; }
        ctx.nodes[key] = result.output;
        nodeStatuses[key] = "completed";
        await logNode(key, "completed", nodeInput, result.output);

        if (node.type === "logic.approval") { runStatus = "paused"; break; }

        const outs = outgoing[key] || [];
        for (const e of outs) {
          if (result.nextHandle && e.source_handle && e.source_handle !== result.nextHandle) continue;
          queue.push({ key: e.target_node_key, input: result.output });
        }
      } catch (err: any) {
        nodeStatuses[key] = "failed";
        runError = err.message || String(err);
        runStatus = "failed";
        await logNode(key, "failed", nodeInput, {}, runError);
        break;
      }
    }

    await supabase.from("automation_runs").update({
      status: runStatus, output_json: ctx.nodes, error: runError,
      completed_at: runStatus !== "paused" ? new Date().toISOString() : null,
    }).eq("id", runId);
    await supabase.from("automation_workflows").update({ last_run_at: new Date().toISOString() }).eq("id", workflow_id);

    return new Response(JSON.stringify({
      run_id: runId, status: runStatus, steps_executed: stepsExecuted,
      node_statuses: nodeStatuses, output: ctx.nodes, error: runError,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("automation-run error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});