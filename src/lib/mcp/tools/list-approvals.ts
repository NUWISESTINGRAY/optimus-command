import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-client";

export default defineTool({
  name: "list_pending_approvals",
  title: "List pending approvals",
  description: "List pending items in the OPTIMUS Approval Gate for the signed-in user.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 20)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("approvals")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { approvals: data ?? [] },
    };
  },
});