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

    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

    // Parse incoming Telegram update
    const update = await req.json();
    const message = update.message;

    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const fromUser = message.from?.username || message.from?.first_name || "Unknown";

    // Find linked user
    const { data: connection } = await supabase
      .from("telegram_connections")
      .select("user_id")
      .eq("chat_id", chatId)
      .eq("is_active", true)
      .single();

    const userId = connection?.user_id;

    // Log inbound message
    if (userId) {
      await supabase.from("telegram_messages").insert({
        user_id: userId,
        chat_id: chatId,
        direction: "inbound",
        message_text: text,
        raw_payload_json: update,
      });
    }

    // Handle commands
    let responseText = "";
    const isCommand = text.startsWith("/");

    if (isCommand) {
      const command = text.split(" ")[0].toLowerCase();
      const args = text.split(" ").slice(1).join(" ").trim();

      switch (command) {
        case "/start": {
          if (!args) {
            responseText = "👋 Welcome to OPTIMUS!\n\nTo link your account, go to Settings > Integrations in the OPTIMUS app, generate a link code, then send:\n`/start <your-code>`";
            break;
          }
          // Look up the link code
          const { data: linkCode, error: lcErr } = await supabase
            .from("telegram_link_codes")
            .select("user_id, expires_at, used")
            .eq("code", args)
            .single();

          if (lcErr || !linkCode) {
            responseText = "❌ Invalid link code. Please generate a new one in Settings > Integrations.";
            break;
          }
          if (linkCode.used) {
            responseText = "❌ This code has already been used. Generate a new one.";
            break;
          }
          if (new Date(linkCode.expires_at) < new Date()) {
            responseText = "❌ This code has expired. Generate a new one in Settings > Integrations.";
            break;
          }

          // Mark code as used
          await supabase
            .from("telegram_link_codes")
            .update({ used: true })
            .eq("code", args);

          // Upsert telegram connection
          const { error: connErr } = await supabase
            .from("telegram_connections")
            .upsert(
              {
                user_id: linkCode.user_id,
                chat_id: chatId,
                bot_name: fromUser,
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );

          if (connErr) {
            console.error("Connection upsert error:", connErr);
            responseText = "⚠️ Failed to link your account. Please try again.";
          } else {
            responseText = "✅ *Account linked successfully!*\n\nYou can now use OPTIMUS via Telegram. Type /help to see available commands.";
          }
          break;
        }
        case "/brief":
          responseText = "📊 *Daily Brief*\nFetching your daily intelligence report...";
          break;
        case "/summarize":
          responseText = "📝 *Summarize*\nSend me the text you want summarized.";
          break;
        case "/tasks":
          if (userId) {
            const { data: tasks } = await supabase
              .from("tasks")
              .select("title, status, priority")
              .eq("user_id", userId)
              .neq("status", "done")
              .limit(5);
            responseText = "✅ *Active Tasks:*\n" +
              (tasks?.map((t: any) => `• [${t.priority}] ${t.title} — _${t.status}_`).join("\n") || "No tasks found.");
          } else {
            responseText = "⚠️ Your Telegram is not linked to an OPTIMUS account. Send /start to connect.";
          }
          break;
        case "/workflow":
          responseText = "⚙️ *ATLAS Workflows*\nUse the OPTIMUS app to manage and trigger workflows.";
          break;
        case "/approvals":
          if (userId) {
            const { data: approvals } = await supabase
              .from("approvals")
              .select("title, risk_level, status")
              .eq("user_id", userId)
              .eq("status", "pending")
              .limit(5);
            responseText = "🛡️ *Pending Approvals:*\n" +
              (approvals?.map((a: any) => `• [${a.risk_level}] ${a.title}`).join("\n") || "No pending approvals.");
          } else {
            responseText = "⚠️ Your Telegram is not linked to an OPTIMUS account. Send /start to connect.";
          }
          break;
        case "/help":
          responseText = `🤖 *OPTIMUS Commands:*
/start <code> — Link your OPTIMUS account
/brief — Daily intelligence brief
/summarize — Summarize text
/tasks — View active tasks
/workflow — Workflow info
/approvals — Pending approvals
/help — This help message

Or just send a message to chat with OPTIMUS AI.`;
          break;
        default:
          responseText = "Unknown command. Type /help for available commands.";
      }
    } else {
      // Route to Optimus AI
      if (userId) {
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: "You are OPTIMUS, an executive AI operating system, responding via Telegram. Keep responses concise and use Telegram markdown formatting. Be professional and actionable.",
                },
                { role: "user", content: text },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            responseText = aiData.choices?.[0]?.message?.content || "I couldn't process that. Try again.";
          } else {
            responseText = "⚠️ AI service temporarily unavailable. Please try again shortly.";
          }
        } catch {
          responseText = "⚠️ Connection error. Please try again.";
        }
      } else {
        responseText = "⚠️ Your Telegram is not linked to OPTIMUS. Send /start with your link code to connect.";
      }
    }

    // Send response via Telegram
    if (TELEGRAM_API_KEY && responseText) {
      const sendResult = await fetch(`${GATEWAY_URL}/sendMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TELEGRAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
          parse_mode: "Markdown",
        }),
      });

      if (!sendResult.ok) {
        const errBody = await sendResult.text();
        console.error("Telegram send failed:", sendResult.status, errBody);
      }

      // Log outbound
      if (userId) {
        await supabase.from("telegram_messages").insert({
          user_id: userId,
          chat_id: chatId,
          direction: "outbound",
          message_text: responseText,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("telegram-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
