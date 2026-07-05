// The MCP tools bundle runs in Deno (Supabase Edge Function). `process.env`
// is polyfilled at runtime — declare it here so the Vite typecheck passes.
declare const process: { env: Record<string, string | undefined> };