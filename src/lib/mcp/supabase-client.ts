import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

// The MCP bundle runs in Deno (Supabase Edge Function). `process.env` is
// polyfilled at runtime; the cast keeps TypeScript happy without pulling in
// @types/node for the whole frontend app.
const env = ((globalThis as unknown) as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

export function supabaseForUser(ctx: ToolContext) {
  return createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}