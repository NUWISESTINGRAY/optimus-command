import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-client";

export default defineTool({
  name: "create_task",
  title: "Create task",
  description: "Create a task in the OPTIMUS mission queue for the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Task title"),
    description: z.string().optional().describe("Longer description"),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Priority (default medium)"),
    due_date: z.string().optional().describe("Due date (ISO 8601)"),
    assignee: z.string().optional().describe("Assignee name or agent codename"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description, priority, due_date, assignee }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("tasks")
      .insert({
        user_id: ctx.getUserId(),
        title,
        description: description ?? null,
        status: "todo",
        priority: priority ?? "medium",
        due_date: due_date ?? null,
        assignee: assignee ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created task ${data.id}: ${data.title}` }],
      structuredContent: { task: data },
    };
  },
});