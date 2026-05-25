import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const anonKey =
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
        Deno.env.get("SUPABASE_ANON_KEY") ??
        supabaseServiceKey;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const { workflow_id, input, test_mode = false, source = "manual" } = await req.json();

    if (!workflow_id) {
      return new Response(JSON.stringify({ error: "workflow_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load workflow
    const { data: workflow, error: wfError } = await supabase
      .from("atlas_workflows")
      .select("*")
      .eq("id", workflow_id)
      .single();

    if (wfError || !workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load steps ordered
    const { data: steps } = await supabase
      .from("atlas_workflow_steps")
      .select("*")
      .eq("workflow_id", workflow_id)
      .order("step_order", { ascending: true });

    if (!steps || steps.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        skipped: true,
        reason: "Workflow has no steps — add at least one step in the builder before running.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create run record
    const { data: run, error: runError } = await supabase
      .from("atlas_workflow_runs")
      .insert({
        workflow_id,
        initiated_by: userId,
        source,
        status: "running",
        input_json: input || {},
      })
      .select("id")
      .single();

    if (runError || !run) {
      return new Response(JSON.stringify({ error: "Failed to create run" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const runId = run.id;
    let runOutput: Record<string, any> = {};
    let currentStepIndex = 0;
    let runStatus = "running";
    let errorMessage: string | null = null;

    // Execute steps sequentially
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      currentStepIndex = i;
      const config = step.config_json || {};

      try {
        switch (step.step_type) {
          case "trigger": {
            runOutput[`step_${i}_trigger`] = { status: "fired", source };
            break;
          }

          case "ai_action": {
            const prompt = (config as any).prompt_template || "Analyze the following input and provide insights.";
            const mode = (config as any).mode || "Auto";
            const aiInput = JSON.stringify(input || {});

            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: `You are OPTIMUS in ${mode} mode. ${prompt}` },
                  { role: "user", content: aiInput },
                ],
              }),
            });

            if (!aiResponse.ok) {
              throw new Error(`AI step failed: ${aiResponse.status}`);
            }

            const aiData = await aiResponse.json();
            const aiContent = aiData.choices?.[0]?.message?.content || "";
            runOutput[`step_${i}_ai`] = { content: aiContent, mode };
            break;
          }

          case "condition": {
            const field = (config as any).field || "";
            const operator = (config as any).operator || "equals";
            const value = (config as any).value || "";
            
            // Simple condition evaluation on input
            const fieldValue = String((input as any)?.[field] || "");
            let conditionMet = false;
            
            switch (operator) {
              case "equals": conditionMet = fieldValue === value; break;
              case "contains": conditionMet = fieldValue.includes(value); break;
              case "greater_than": conditionMet = Number(fieldValue) > Number(value); break;
              case "less_than": conditionMet = Number(fieldValue) < Number(value); break;
              default: conditionMet = fieldValue === value;
            }
            
            runOutput[`step_${i}_condition`] = { field, operator, value, result: conditionMet };
            
            if (!conditionMet && (config as any).skip_on_false) {
              runOutput[`step_${i}_skipped`] = true;
              continue;
            }
            break;
          }

          case "action": {
            const actionType = (config as any).action_type || "notify";
            
            switch (actionType) {
              case "create_task": {
                if (userId) {
                  await supabase.from("tasks").insert({
                    user_id: userId,
                    title: (config as any).task_title || "Auto-generated task",
                    description: (config as any).task_description || "",
                    priority: (config as any).priority || "medium",
                    status: "todo",
                  });
                }
                runOutput[`step_${i}_action`] = { type: "create_task", status: "created" };
                break;
              }
              case "create_document": {
                if (userId) {
                  await supabase.from("documents").insert({
                    user_id: userId,
                    title: (config as any).doc_title || "Auto-generated document",
                    content: runOutput[`step_${i - 1}_ai`]?.content || "",
                    doc_type: "document",
                    status: "draft",
                  });
                }
                runOutput[`step_${i}_action`] = { type: "create_document", status: "created" };
                break;
              }
              case "notify": {
                if (userId) {
                  await supabase.from("notifications").insert({
                    user_id: userId,
                    title: (config as any).notify_title || "ATLAS Workflow Notification",
                    message: (config as any).notify_message || "A workflow step completed.",
                    type: "info",
                    channel: "app",
                  });
                }
                runOutput[`step_${i}_action`] = { type: "notify", status: "sent" };
                break;
              }
              case "send_telegram": {
                // Will call telegram-send-message function
                const telegramMsg = (config as any).message || "ATLAS workflow notification";
                try {
                  await fetch(`${supabaseUrl}/functions/v1/telegram-send-message`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({ user_id: userId, message: telegramMsg }),
                  });
                  runOutput[`step_${i}_action`] = { type: "send_telegram", status: "sent" };
                } catch {
                  runOutput[`step_${i}_action`] = { type: "send_telegram", status: "failed" };
                }
                break;
              }
              default:
                runOutput[`step_${i}_action`] = { type: actionType, status: "unknown_action" };
            }
            break;
          }

          case "approval": {
            if (userId) {
              await supabase.from("approvals").insert({
                user_id: userId,
                source_type: "atlas_workflow",
                source_id: runId,
                title: (config as any).title || step.title,
                summary: (config as any).summary || "Workflow requires approval to continue.",
                risk_level: (config as any).risk_level || "medium",
                status: "pending",
                payload_json: { workflow_id, run_id: runId, step_index: i },
              });
            }
            
            // Pause the run
            runStatus = "paused";
            runOutput[`step_${i}_approval`] = { status: "waiting_for_approval" };
            
            await supabase.from("atlas_workflow_runs").update({
              status: "paused",
              current_step_index: i,
              output_json: runOutput,
            }).eq("id", runId);

            return new Response(JSON.stringify({
              run_id: runId,
              status: "paused",
              paused_at_step: i,
              message: "Workflow paused — awaiting approval.",
              output: runOutput,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (stepError) {
        errorMessage = stepError instanceof Error ? stepError.message : "Step execution failed";
        runOutput[`step_${i}_error`] = errorMessage;
        runStatus = "failed";
        break;
      }
    }

    // Finalize run
    if (runStatus === "running") runStatus = "completed";
    
    await supabase.from("atlas_workflow_runs").update({
      status: runStatus,
      current_step_index: currentStepIndex,
      output_json: runOutput,
      error_message: errorMessage,
      completed_at: runStatus !== "paused" ? new Date().toISOString() : null,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      run_id: runId,
      status: runStatus,
      steps_executed: currentStepIndex + 1,
      output: runOutput,
      error: errorMessage,
      test_mode,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("atlas-run-workflow error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
