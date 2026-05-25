import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? SERVICE_KEY;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const query: string = body.query;
    const limit: number = body.limit ?? 5;
    if (!query) return new Response(JSON.stringify({ error: "query required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Resolve user
    let userId: string | null = body.user_id ?? null;
    if (!userId) {
      const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (auth) {
        const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${auth}` } } });
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id ?? null;
      }
    }
    if (!userId) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: query }),
    });
    if (!embRes.ok) throw new Error(`embed ${embRes.status}`);
    const embJson = await embRes.json();
    const embedding = embJson.data?.[0]?.embedding;
    if (!embedding) throw new Error("no embedding");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: embedding,
      match_count: limit,
      _user_id: userId,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ matches: data ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("knowledge-search", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
