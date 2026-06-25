// supabase/functions/telegram-webhook/index.ts
//
// Flow:
//   1. You text Optimus:  /post linkedin write about the Storehouse Partnership
//   2. Claude drafts the post, it's saved to agent_tasks, and sent back to you
//      in Telegram with Approve / Revise / Reject buttons.
//   3. Approve  -> posts live via Ayrshare, edits the message to confirm.
//      Reject   -> marks rejected, no post.
//      Revise   -> asks you to send /edit <task_id> <new text>, then re-shows
//                  the revised draft with the same three buttons.
//
// Required secrets (set in Lovable's Secrets panel):
//   TELEGRAM_BOT_TOKEN      - your existing Optimus bot token
//   TELEGRAM_OWNER_CHAT_ID  - your personal Telegram chat id (locks the bot
//                             so only you can trigger drafts/posts)
//   ANTHROPIC_API_KEY       - Claude API key
//   AYRSHARE_API_KEY        - from app.ayrshare.com after linking your accounts
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Supabase/Lovable Cloud runtime - you don't need to set those yourself.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_OWNER_CHAT_ID = Deno.env.get("TELEGRAM_OWNER_CHAT_ID")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const AYRSHARE_API_KEY = Deno.env.get("AYRSHARE_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// ---------- Telegram helpers ----------

async function tgSend(chatId: number | string, text: string, replyMarkup?: unknown) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup, parse_mode: "Markdown" }),
  });
  return res.json();
}

async function tgEdit(chatId: number | string, messageId: number, text: string) {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "Markdown" }),
  });
}

async function tgAnswerCallback(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

function approvalKeyboard(taskId: string) {
  return {
    inline_keyboard: [[
      { text: "✅ Approve & Post", callback_data: `approve:${taskId}` },
      { text: "✏️ Revise", callback_data: `revise:${taskId}` },
      { text: "❌ Reject", callback_data: `reject:${taskId}` },
    ]],
  };
}

// ---------- Drafting ----------

async function draftContent(platform: string, requestText: string): Promise<string> {
  const systemPrompt =
    `You are Optimus, JW Brand's content agent. Write a single ${platform} post based on ` +
    `the request below. Confident, premium, ecosystem-builder voice. No hashtags unless asked. ` +
    `Output only the post text, no preamble.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: requestText }],
    }),
  });
  const data = await res.json();
  const block = data?.content?.find((b: { type: string }) => b.type === "text");
  return block?.text ?? "(draft generation failed - check ANTHROPIC_API_KEY)";
}

// ---------- Posting ----------

async function postToAyrshare(platform: string, content: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const platformMap: Record<string, string> = {
    linkedin: "linkedin",
    ig: "instagram",
    instagram: "instagram",
    x: "twitter",
    twitter: "twitter",
    fb: "facebook",
    facebook: "facebook",
  };
  const mapped = platformMap[platform.toLowerCase()] ?? "linkedin";

  const res = await fetch("https://app.ayrshare.com/api/post", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AYRSHARE_API_KEY}` },
    body: JSON.stringify({ post: content, platforms: [mapped] }),
  });
  const data = await res.json();
  if (res.ok && !data.errors) {
    return { ok: true, id: data.id ?? data.postIds?.[0]?.id };
  }
  return { ok: false, error: JSON.stringify(data) };
}

// ---------- Command parsing ----------

function parsePostCommand(text: string): { platform: string; topic: string } | null {
  const match = text.match(/^\/post(?:\s+(linkedin|ig|instagram|x|twitter|fb|facebook))?\s+([\s\S]+)/i);
  if (!match) return null;
  return { platform: (match[1] ?? "linkedin").toLowerCase(), topic: match[2].trim() };
}

function parseEditCommand(text: string): { taskId: string; newText: string } | null {
  const match = text.match(/^\/edit\s+([a-f0-9-]{36})\s+([\s\S]+)/i);
  if (!match) return null;
  return { taskId: match[1], newText: match[2].trim() };
}

// ---------- Main handler ----------

serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  const update = await req.json();

  // --- Button press: approve / revise / reject ---
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message?.chat?.id;
    const messageId = cq.message?.message_id;

    if (String(chatId) !== String(TELEGRAM_OWNER_CHAT_ID)) {
      await tgAnswerCallback(cq.id, "Not authorized.");
      return new Response("ok");
    }

    const [action, taskId] = (cq.data as string).split(":");
    const { data: task } = await supabase.from("agent_tasks").select("*").eq("id", taskId).single();
    if (!task) {
      await tgAnswerCallback(cq.id, "Task not found.");
      return new Response("ok");
    }

    if (action === "approve") {
      const result = await postToAyrshare(task.platform, task.draft_content);
      if (result.ok) {
        await supabase.from("agent_tasks")
          .update({ status: "posted", ayrshare_post_id: result.id, updated_at: new Date().toISOString() })
          .eq("id", taskId);
        await tgEdit(chatId, messageId, `✅ *Posted to ${task.platform}*\n\n${task.draft_content}`);
        await tgAnswerCallback(cq.id, "Posted.");
      } else {
        await supabase.from("agent_tasks")
          .update({ status: "failed", error: result.error, updated_at: new Date().toISOString() })
          .eq("id", taskId);
        await tgEdit(chatId, messageId, `⚠️ *Post failed*\n\n${task.draft_content}\n\nError logged. Try /post again.`);
        await tgAnswerCallback(cq.id, "Failed - see chat.");
      }
    } else if (action === "reject") {
      await supabase.from("agent_tasks")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", taskId);
      await tgEdit(chatId, messageId, `❌ *Rejected*\n\n${task.draft_content}`);
      await tgAnswerCallback(cq.id, "Rejected.");
    } else if (action === "revise") {
      await supabase.from("agent_tasks")
        .update({ status: "revision_requested", updated_at: new Date().toISOString() })
        .eq("id", taskId);
      await tgEdit(
        chatId,
        messageId,
        `✏️ *Revision requested*\n\nOriginal draft:\n${task.draft_content}\n\nReply with:\n\`/edit ${taskId} <your revised text>\``
      );
      await tgAnswerCallback(cq.id, "Send your revision.");
    }
    return new Response("ok");
  }

  // --- Plain text message ---
  const msg = update.message;
  if (!msg?.text) return new Response("ok");

  const chatId = msg.chat.id;
  if (String(chatId) !== String(TELEGRAM_OWNER_CHAT_ID)) {
    return new Response("ok"); // silently ignore anyone who isn't you
  }
  const text = msg.text as string;

  // /post <platform?> <topic> -> new draft
  const postCmd = parsePostCommand(text);
  if (postCmd) {
    const draft = await draftContent(postCmd.platform, postCmd.topic);
    const { data: inserted } = await supabase.from("agent_tasks").insert({
      chat_id: chatId,
      platform: postCmd.platform,
      request_text: postCmd.topic,
      draft_content: draft,
      status: "pending_approval",
    }).select().single();

    const sent = await tgSend(chatId, `*Draft for ${postCmd.platform}:*\n\n${draft}`, approvalKeyboard(inserted.id));
    if (sent?.result?.message_id) {
      await supabase.from("agent_tasks").update({ telegram_message_id: sent.result.message_id }).eq("id", inserted.id);
    }
    return new Response("ok");
  }

  // /edit <task_id> <new text> -> revise existing draft, re-show for approval
  const editCmd = parseEditCommand(text);
  if (editCmd) {
    const { data: task } = await supabase.from("agent_tasks")
      .update({ draft_content: editCmd.newText, status: "pending_approval", updated_at: new Date().toISOString() })
      .eq("id", editCmd.taskId)
      .select()
      .single();

    if (task) {
      const sent = await tgSend(chatId, `*Revised draft for ${task.platform}:*\n\n${task.draft_content}`, approvalKeyboard(task.id));
      if (sent?.result?.message_id) {
        await supabase.from("agent_tasks").update({ telegram_message_id: sent.result.message_id }).eq("id", task.id);
      }
    }
    return new Response("ok");
  }

  await tgSend(chatId, "Send `/post <topic>` (optionally `/post linkedin <topic>`) and I'll draft it for your approval.");
  return new Response("ok");
});
