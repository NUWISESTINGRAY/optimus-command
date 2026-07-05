import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTasksTool from "./tools/list-tasks";
import createTaskTool from "./tools/create-task";
import listAgentsTool from "./tools/list-agents";
import listApprovalsTool from "./tools/list-approvals";

// Build the OAuth issuer from the project ref (inlined by Vite at build time).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "optimus-mcp",
  title: "OPTIMUS AI OS",
  version: "0.1.0",
  instructions:
    "Tools for OPTIMUS — an Executive AI Operating System. Use list_tasks / create_task to work with the Mission Queue, list_agents to see the JW Brand AI team roster, and list_pending_approvals to check the Approval Gate.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTasksTool, createTaskTool, listAgentsTool, listApprovalsTool],
});