import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Mode System Prompts ──
const MODE_PROMPTS: Record<string, string> = {
  Auto: `You are OPTIMUS, an executive AI operating system. Analyze the user's request and respond in the most appropriate mode. You can handle strategy, operations, finance, technology, marketing, HR, research, and executive assistance. Always provide structured, actionable responses.`,
  COO: `You are OPTIMUS in COO mode. Focus on operations: plans, SOPs, KPIs, process optimization, workflows, resource allocation, and operational efficiency. Structure responses with clear action items and metrics.`,
  CMO: `You are OPTIMUS in CMO mode. Focus on marketing: messaging, campaigns, offers, GTM strategy, brand positioning, audience analysis, content strategy, and growth metrics.`,
  CFO: `You are OPTIMUS in CFO mode. Focus on finance: pricing, scenario analysis, budgets, financial modeling, revenue forecasting, cost optimization, and financial risk assessment.`,
  CTO: `You are OPTIMUS in CTO mode. Focus on technology: system architecture, integrations, implementation plans, technical debt, security, scalability, and engineering strategy.`,
  CRO: `You are OPTIMUS in CRO mode. Focus on revenue: sales strategy, pipeline optimization, deal analysis, pricing strategy, revenue operations, and customer acquisition.`,
  HR: `You are OPTIMUS in HR mode. Focus on people: hiring, culture, performance management, organizational design, compensation, training, and employee experience.`,
  Research: `You are OPTIMUS in Research mode. Provide source-oriented, structured research responses. Include key findings, data points, analysis, and recommendations. Cite sources when possible.`,
  "Executive Assistant": `You are OPTIMUS in Executive Assistant mode. Prioritize summaries, action items, drafts, follow-ups, scheduling suggestions, and communication management. Be concise and proactive.`,
  "Chief of Staff": `You are OPTIMUS in Chief of Staff mode. Focus on cross-functional coordination, strategic initiatives, stakeholder management, decision support, and organizational alignment.`,
};

function classifyTask(message: string): string {
  const lower = message.toLowerCase();
  if (lower.match(/budget|revenue|cost|financ|pricing|forecast|p&l|margin/)) return "CFO";
  if (lower.match(/market|campaign|brand|audience|content|seo|gtm|advertis/)) return "CMO";
  if (lower.match(/architect|api|deploy|code|engineer|infra|system|tech/)) return "CTO";
  if (lower.match(/pipeline|deal|sales|quota|close|prospect|revenue ops/)) return "CRO";
  if (lower.match(/hire|culture|perform|compen|training|employee|team/)) return "HR";
  if (lower.match(/research|analyz|study|report|data|find|compare/)) return "Research";
  if (lower.match(/schedule|draft|reply|follow.?up|summarize|remind|brief/)) return "Executive Assistant";
  if (lower.match(/process|sop|workflow|efficien|operations|kpi|metric/)) return "COO";
  if (lower.match(/coordinate|strategic|stakeholder|initiative|align/)) return "Chief of Staff";
  return "Executive Assistant";
}

function buildSystemPrompt(mode: string): string {
  return MODE_PROMPTS[mode] || MODE_PROMPTS["Auto"];
}

interface AgentResponse {
  response_text: string;
  mode_used: string;
  confidence: number;
  citations: string[];
  suggested_actions: string[];
  generated_tasks: Array<{ title: string; priority: string }>;
  requires_approval: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const body = await req.json();
    const { message, session_id, mode = "Auto", attachments, context } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine mode
    const resolvedMode = mode === "Auto" ? classifyTask(message) : mode;
    const systemPrompt = buildSystemPrompt(resolvedMode);

    // Build conversation history
    let conversationMessages: Array<{ role: string; content: string }> = [];
    if (session_id && userId) {
      const { data: history } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true })
        .limit(20);
      if (history) {
        conversationMessages = history.map((m: any) => ({ role: m.role, content: m.content }));
      }
    }

    // Build the enhanced prompt with structured output request
    const enhancedUserMessage = `${message}

IMPORTANT: After your main response, add a JSON block wrapped in <optimus-meta> tags with this structure:
<optimus-meta>
{
  "confidence": 0.0-1.0,
  "citations": ["source1", "source2"],
  "suggested_actions": ["action1", "action2"],
  "generated_tasks": [{"title": "task", "priority": "high|medium|low"}],
  "requires_approval": false
}
</optimus-meta>`;

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationMessages,
          { role: "user", content: enhancedUserMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure session exists
    let activeSessionId = session_id;
    if (userId) {
      if (!activeSessionId) {
        const { data: newSession } = await supabase
          .from("chat_sessions")
          .insert({ user_id: userId, title: message.slice(0, 60), mode: resolvedMode })
          .select("id")
          .single();
        activeSessionId = newSession?.id;
      }

      // Save user message
      if (activeSessionId) {
        await supabase.from("chat_messages").insert({
          session_id: activeSessionId,
          role: "user",
          content: message,
          attachments_json: attachments || [],
        });
      }
    }

    // Stream the response back with session metadata in headers
    const headers = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "X-Session-Id": activeSessionId || "",
      "X-Mode-Used": resolvedMode,
    };

    // Create a transform stream to intercept and save the full response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          await writer.write(new TextEncoder().encode(chunk));

          // Extract content from SSE chunks
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullContent += content;
            } catch { /* partial chunk */ }
          }
        }
      } finally {
        // Save assistant message and agent run
        if (userId && activeSessionId) {
          // Parse meta from response
          let meta: any = { confidence: 0.85, citations: [], suggested_actions: [], generated_tasks: [], requires_approval: false };
          const metaMatch = fullContent.match(/<optimus-meta>([\s\S]*?)<\/optimus-meta>/);
          if (metaMatch) {
            try { meta = JSON.parse(metaMatch[1]); } catch {}
            fullContent = fullContent.replace(/<optimus-meta>[\s\S]*?<\/optimus-meta>/, "").trim();
          }

          await supabase.from("chat_messages").insert({
            session_id: activeSessionId,
            role: "assistant",
            content: fullContent,
            mode: resolvedMode,
            citations_json: meta.citations || [],
            metadata: {
              confidence: meta.confidence,
              suggested_actions: meta.suggested_actions,
              generated_tasks: meta.generated_tasks,
              requires_approval: meta.requires_approval,
            },
          });

          await supabase.from("agent_runs").insert({
            user_id: userId,
            session_id: activeSessionId,
            agent_type: "optimus-chat",
            agent_mode: resolvedMode,
            task_type: "chat",
            status: "completed",
            input_json: { message, mode, context },
            output_json: { response_length: fullContent.length, ...meta },
            confidence: meta.confidence,
            completed_at: new Date().toISOString(),
          });
        }

        await writer.close();
      }
    })();

    return new Response(readable, { headers });

  } catch (e) {
    console.error("optimus-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
