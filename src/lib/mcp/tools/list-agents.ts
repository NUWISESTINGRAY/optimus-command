import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase-client";

export default defineTool({
  name: "list_agents",
  title: "List agents",
  description: "List the JW Brand AI team roster (17 executive and specialist agents).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("jwba_agents")
      .select("codename,display_name,sort_order,status,spec")
      .order("sort_order");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { agents: data ?? [] },
    };
  },
});