import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HISTORY_LIMIT = 12;

function buildSystemPrompt(agent: any): string {
  const spec = agent?.spec ?? {};
  const role = spec.role ?? "Executive AI partner";
  const tagline = spec.tagline ?? "";
  const expertise = Array.isArray(spec.expertise) ? spec.expertise.join(", ") : "";
  const resp = Array.isArray(spec.responsibilities) ? spec.responsibilities.join(", ") : "";
  return `You are ${agent?.display_name ?? "Optimus"} (codename: ${agent?.codename ?? "optimus"}), ${role}. ${tagline}
Expertise: ${expertise}.
Responsibilities: ${resp}.
You are replying inside Telegram. Use concise Telegram-style markdown. Stay in character for ${agent?.display_name ?? "Optimus"} — strategic, professional, and actionable. Always begin your reply with *${agent?.display_name ?? "Optimus"}* on its own line.`;
}

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
/agents — List all AI agents you can talk to
/agent <codename> — Switch active agent (e.g. /agent athena)
@codename ... — One-off message to that agent (e.g. @cipher review my API)
/reset — Clear conversation memory
/save — Save this thread into today's daily page
/endroom — Close current room without saving
/brief — Daily intelligence brief
/tasks — View active tasks
/approvals — Pending approvals
/help — This help message

Just send a message to chat with the active agent.`;
          break;
        case "/agents": {
          const { data: agents } = await supabase.from("jwba_agents").select("codename, display_name, spec").order("sort_order");
          responseText = "🧠 *Available agents:*\n" + (agents || []).map((a: any) => `• *${a.display_name}* (\`${a.codename}\`) — ${a.spec?.role ?? ""}`).join("\n") +
            "\n\nSwitch with `/agent <codename>` or tag inline with `@codename ...`";
          break;
        }
        case "/agent": {
          if (!userId) { responseText = "⚠️ Link your account first with /start <code>."; break; }
          const target = args.toLowerCase().replace(/^@/, "");
          if (!target) { responseText = "Usage: `/agent <codename>` — see /agents for the list."; break; }
          const { data: agent } = await supabase.from("jwba_agents").select("codename, display_name").eq("codename", target).maybeSingle();
          if (!agent) { responseText = `❌ No agent \`${target}\`. Try /agents.`; break; }
          await supabase.from("jwba_agent_state").upsert(
            { user_id: userId, telegram_chat_id: chatId, active_agent: agent.codename, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
          responseText = `✅ Active agent is now *${agent.display_name}*. Send a message to talk to them.`;
          break;
        }
        case "/reset": {
          if (!userId) { responseText = "⚠️ Link your account first."; break; }
          await supabase.from("telegram_messages").insert({
            user_id: userId, chat_id: chatId, direction: "system",
            message_text: "[memory cleared]", raw_payload_json: { marker: "reset" },
          });
          responseText = "🧹 Memory cleared. New conversation starts now.";
          break;
        }
        case "/save": {
          if (!userId) { responseText = "⚠️ Link your account first."; break; }
          const today = new Date().toISOString().slice(0, 10);
          const { data: room } = await supabase.from("jwba_rooms")
            .select("id, title").eq("user_id", userId).eq("status", "open")
            .like("title", `Telegram – ${today}%`).maybeSingle();
          if (!room) { responseText = "ℹ️ No active Telegram thread to save today."; break; }
          // Ensure today's daily page
          let { data: page } = await supabase.from("jwba_pages").select("id")
            .eq("tenant_id", userId).eq("daily_date", today).maybeSingle();
          if (!page) {
            const ins = await supabase.from("jwba_pages").insert({
              tenant_id: userId, title: today, is_daily: true, daily_date: today,
            }).select().single();
            page = ins.data;
          }
          if (!page) { responseText = "⚠️ Could not open today's daily page."; break; }
          // Inline save (service role — bypasses jwba-room-save's user auth requirement)
          const { data: msgs } = await supabase.from("jwba_room_messages").select("*").eq("room_id", room.id).order("created_at");
          const { data: existing } = await supabase.from("jwba_blocks").select("sort_order").eq("page_id", page.id).order("sort_order", { ascending: false }).limit(1);
          const baseSort = (existing?.[0]?.sort_order ?? 0) + 1;
          const { data: parent } = await supabase.from("jwba_blocks").insert({
            page_id: page.id, sort_order: baseSort, content: `Meeting: ${room.title}`, block_type: "meeting", created_by: userId,
          }).select().single();
          if (parent && msgs?.length) {
            await supabase.from("jwba_blocks").insert(msgs.map((m: any, i: number) => ({
              page_id: page!.id, parent_id: parent.id, sort_order: i + 1,
              content: m.content, block_type: m.sender_kind === "agent" ? "agent" : "text",
              agent_codename: m.agent_codename, created_by: userId,
            })));
          }
          await supabase.from("jwba_rooms").update({ status: "closed", saved_block_id: parent?.id, closed_at: new Date().toISOString() }).eq("id", room.id);
          responseText = `💾 Saved ${msgs?.length ?? 0} messages to today's daily page.`;
          break;
        }
        case "/endroom": {
          if (!userId) { responseText = "⚠️ Link your account first."; break; }
          const today = new Date().toISOString().slice(0, 10);
          const { data: room } = await supabase.from("jwba_rooms")
            .select("id").eq("user_id", userId).eq("status", "open")
            .like("title", `Telegram – ${today}%`).maybeSingle();
          if (!room) { responseText = "ℹ️ No active Telegram thread."; break; }
          await supabase.from("jwba_rooms").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", room.id);
          responseText = "🛑 Room closed without saving.";
          break;
        }
        default:
          responseText = "Unknown command. Type /help for available commands.";
      }
    } else {
      // Dispatch telegram-triggered automations (fire and forget)
      if (userId) {
        try {
          const { data: autos } = await supabase.from("automation_workflows")
            .select("id, telegram_filter")
            .eq("user_id", userId).eq("active", true).eq("trigger_type", "telegram");
          for (const a of (autos || [])) {
            if (a.telegram_filter && !text.includes(a.telegram_filter)) continue;
            fetch(`${supabaseUrl}/functions/v1/automation-run`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
              body: JSON.stringify({ workflow_id: a.id, trigger_source: "telegram", input: { text, chat_id: chatId, from: fromUser } }),
            }).catch(() => {});
          }
        } catch (e) { console.error("telegram auto-dispatch:", e); }
      }
      // Multi-agent conversational routing
      if (userId) {
        try {
          // 1. Resolve agent: @mention takes precedence, else active_agent state, else optimus
          let targetCodename: string | null = null;
          let cleanedText = text;
          const mention = text.match(/^@([a-z]+)\b\s*/i);
          if (mention) {
            targetCodename = mention[1].toLowerCase();
            cleanedText = text.slice(mention[0].length).trim() || text;
          }
          if (!targetCodename) {
            const { data: state } = await supabase.from("jwba_agent_state")
              .select("active_agent").eq("user_id", userId).maybeSingle();
            targetCodename = state?.active_agent ?? "optimus";
          }
          const { data: agentRow } = await supabase.from("jwba_agents")
            .select("codename, display_name, spec").eq("codename", targetCodename).maybeSingle();
          const agent = agentRow ?? { codename: "optimus", display_name: "Optimus", spec: {} };

          // 2. Load rolling memory — last N turns since most recent reset marker
          const { data: history } = await supabase.from("telegram_messages")
            .select("direction, message_text, raw_payload_json, created_at")
            .eq("chat_id", chatId).order("created_at", { ascending: false }).limit(40);
          const ordered = (history ?? []).slice().reverse();
          const lastResetIdx = ordered.map((m: any) => m.raw_payload_json?.marker === "reset").lastIndexOf(true);
          const recent = (lastResetIdx >= 0 ? ordered.slice(lastResetIdx + 1) : ordered)
            .filter((m: any) => m.direction === "inbound" || m.direction === "outbound")
            .slice(-HISTORY_LIMIT);

          const chatMessages: any[] = [
            { role: "system", content: buildSystemPrompt(agent) },
            ...recent.map((m: any) => ({
              role: m.direction === "inbound" ? "user" : "assistant",
              content: m.message_text ?? "",
            })),
          ];
          // Replace last user turn with cleanedText (strip @mention) if mention used
          if (mention && chatMessages.length > 1 && chatMessages[chatMessages.length - 1].role === "user") {
            chatMessages[chatMessages.length - 1].content = cleanedText;
          }
          // The just-inserted inbound message is already in history; ensure it's the last user turn
          if (chatMessages[chatMessages.length - 1]?.role !== "user") {
            chatMessages.push({ role: "user", content: cleanedText });
          }

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: chatMessages }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            responseText = aiData.choices?.[0]?.message?.content || "I couldn't process that. Try again.";
          } else {
            responseText = "⚠️ AI service temporarily unavailable. Please try again shortly.";
          }

          // 3. Bridge into today's JWBA room
          try {
            const today = new Date().toISOString().slice(0, 10);
            const titlePrefix = `Telegram – ${today}`;
            let { data: room } = await supabase.from("jwba_rooms")
              .select("id").eq("user_id", userId).eq("status", "open")
              .like("title", `${titlePrefix}%`).maybeSingle();
            if (!room) {
              const ins = await supabase.from("jwba_rooms").insert({
                user_id: userId, title: titlePrefix, status: "open",
              }).select("id").single();
              room = ins.data;
              if (room) {
                await supabase.from("jwba_room_members").insert([
                  { room_id: room.id, role: "host", agent_codename: null },
                  { room_id: room.id, role: "agent", agent_codename: agent.codename },
                ]);
              }
            } else {
              // Ensure this agent is a member
              const { data: existing } = await supabase.from("jwba_room_members")
                .select("id").eq("room_id", room.id).eq("agent_codename", agent.codename).is("left_at", null).maybeSingle();
              if (!existing) {
                await supabase.from("jwba_room_members").insert({
                  room_id: room.id, role: "agent", agent_codename: agent.codename,
                });
              }
            }
            if (room) {
              await supabase.from("jwba_room_messages").insert([
                { room_id: room.id, sender_kind: "user", agent_codename: null, content: cleanedText },
                { room_id: room.id, sender_kind: "agent", agent_codename: agent.codename, content: responseText },
              ]);
            }
          } catch (e) { console.error("room bridge:", e); }
        } catch (e) {
          console.error("ai route:", e);
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
