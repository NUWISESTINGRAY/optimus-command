import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    out.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return out.slice(0, 80); // hard cap so embedding cost is bounded
}

async function embedBatch(inputs: string[]): Promise<number[][]> {
  if (!inputs.length) return [];
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: inputs }),
  });
  if (!res.ok) {
    console.error("embed error", res.status, await res.text());
    return inputs.map(() => []);
  }
  const j = await res.json();
  return (j.data || []).map((d: any) => d.embedding);
}

async function summarize(title: string, content: string): Promise<string> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Summarize the document in 2-3 crisp sentences. Plain text only." },
          { role: "user", content: `Title: ${title}\n\n${content.slice(0, 8000)}` },
        ],
        max_tokens: 200,
      }),
    });
    const j = await res.json();
    return j.choices?.[0]?.message?.content?.trim() ?? "";
  } catch { return ""; }
}

async function firecrawlScrape(url: string) {
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  const md = j.markdown ?? j.data?.markdown ?? "";
  const meta = j.metadata ?? j.data?.metadata ?? {};
  return { markdown: md, title: meta.title ?? url };
}

async function firecrawlSearch(query: string, limit = 5) {
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Firecrawl search ${res.status}`);
  const items = j.data?.web ?? j.data ?? j.web ?? [];
  return Array.isArray(items) ? items : [];
}

async function notify(supabase: any, userId: string, docId: string, title: string, source: string, summary: string) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title: `📚 New in Knowledge Vault — ${title}`,
    body: summary || `Auto-discovered from ${source}. Keep or archive?`,
    message: summary || null,
    type: "knowledge",
    channel: "app",
    link: `/documents?doc=${docId}`,
    payload_json: { document_id: docId, source },
    status: "unread",
  });

  // Telegram with inline keep/archive
  const { data: conn } = await supabase
    .from("telegram_connections").select("chat_id").eq("user_id", userId).eq("is_active", true).maybeSingle();
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (conn?.chat_id && TELEGRAM_API_KEY) {
    await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: conn.chat_id,
        text: `📚 *Knowledge Vault — new ${source}*\n*${title}*\n\n${summary || "_no summary_"}`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[
          { text: "✅ Keep", callback_data: `kdoc:keep:${docId}` },
          { text: "🗑 Archive", callback_data: `kdoc:archive:${docId}` },
        ]] },
      }),
    }).catch((e) => console.error("tg notify", e));
  }
}

async function ingestDocument(
  supabase: any,
  userId: string,
  opts: { title: string; content: string; source: string; source_url?: string | null; auto?: boolean; tags?: string[] }
) {
  const summary = await summarize(opts.title, opts.content);
  const { data: doc, error } = await supabase.from("documents").insert({
    user_id: userId,
    title: opts.title.slice(0, 240),
    content: opts.content,
    summary,
    source: opts.source,
    source_url: opts.source_url ?? null,
    auto: opts.auto ?? false,
    status: "active",
    doc_type: "knowledge",
    tags: opts.tags ?? [opts.source],
  }).select("id").single();
  if (error) throw error;

  const chunks = chunkText(opts.content);
  if (chunks.length) {
    const embeddings = await embedBatch(chunks);
    const rows = chunks.map((content, idx) => ({
      document_id: doc.id,
      user_id: userId,
      chunk_idx: idx,
      content,
      embedding: embeddings[idx]?.length ? embeddings[idx] : null,
    }));
    await supabase.from("document_chunks").insert(rows);
  }

  await notify(supabase, userId, doc.id, opts.title, opts.source, summary);
  return doc.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();
    const { kind } = body;

    // Resolve user id: from JWT if user call, else explicit user_id (service-to-service)
    let userId: string | null = body.user_id ?? null;
    if (!userId) {
      const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (auth) {
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? SERVICE_KEY, {
          global: { headers: { Authorization: `Bearer ${auth}` } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id ?? null;
      }
    }
    if (!userId) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (kind === "url") {
      const url = String(body.url || "");
      if (!url) throw new Error("url required");
      const { markdown, title } = await firecrawlScrape(url);
      if (!markdown) throw new Error("no content scraped");
      const id = await ingestDocument(supabase, userId, { title, content: markdown, source: "web", source_url: url, auto: false });
      return new Response(JSON.stringify({ ok: true, document_id: id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (kind === "text") {
      const id = await ingestDocument(supabase, userId, {
        title: body.title || "Untitled",
        content: body.content || "",
        source: body.source || "text",
        source_url: body.source_url ?? null,
        auto: !!body.auto,
        tags: body.tags,
      });
      return new Response(JSON.stringify({ ok: true, document_id: id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (kind === "file") {
      const storage_path: string = body.storage_path;
      if (!storage_path) throw new Error("storage_path required");
      const { data: file } = await supabase.storage.from("knowledge-uploads").download(storage_path);
      if (!file) throw new Error("file not found");
      const mime = body.mime || file.type || "";
      let content = "";
      const titleFromPath = storage_path.split("/").pop() || "Uploaded file";
      if (mime.startsWith("text/") || mime.includes("json") || mime.includes("markdown")) {
        content = await file.text();
      } else {
        // For PDFs and other binaries, send to Gemini via multimodal — but to keep this lightweight, base64 + ask to extract text
        const buf = new Uint8Array(await file.arrayBuffer());
        const b64 = btoa(String.fromCharCode(...buf.slice(0, 6 * 1024 * 1024))); // cap ~6MB
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: [
              { type: "text", text: "Extract all readable text from this document. Plain text only, preserve structure with line breaks." },
              { type: "image_url", image_url: { url: `data:${mime || "application/pdf"};base64,${b64}` } },
            ] }],
            max_tokens: 4000,
          }),
        });
        const j = await res.json();
        content = j.choices?.[0]?.message?.content ?? "";
      }
      if (!content.trim()) throw new Error("no content extracted");
      const id = await ingestDocument(supabase, userId, {
        title: body.title || titleFromPath,
        content,
        source: "upload",
        source_url: storage_path,
        auto: false,
      });
      return new Response(JSON.stringify({ ok: true, document_id: id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (kind === "research") {
      const topic_id: string = body.topic_id;
      const { data: topic } = await supabase.from("knowledge_topics").select("*").eq("id", topic_id).single();
      if (!topic) throw new Error("topic not found");
      const results = await firecrawlSearch(topic.query, 4);
      const ids: string[] = [];
      for (const r of results) {
        const md = r.markdown || r.description || r.snippet || r.title || "";
        if (!md) continue;
        try {
          const id = await ingestDocument(supabase, topic.user_id, {
            title: `[${topic.label}] ${r.title || r.url || "Research result"}`,
            content: `${r.title ?? ""}\n${r.url ?? ""}\n\n${md}`,
            source: "research",
            source_url: r.url ?? null,
            auto: true,
            tags: [topic.label, "auto", "research"],
          });
          ids.push(id);
        } catch (e) { console.error("research ingest", e); }
      }
      await supabase.from("knowledge_topics").update({ last_run_at: new Date().toISOString() }).eq("id", topic_id);
      return new Response(JSON.stringify({ ok: true, documents: ids }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown kind" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("knowledge-ingest", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
