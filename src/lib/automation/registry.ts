import {
  Play, Clock, Globe, Send, Database, Webhook, Code2, GitBranch, Repeat,
  Timer, Bot, ShieldCheck, Bell, FileText, CheckSquare, Zap, Mail, Workflow,
} from "lucide-react";

export type NodeCategory = "trigger" | "action" | "logic" | "ai" | "integration";

export type FieldSchema =
  | { kind: "text"; key: string; label: string; placeholder?: string; multiline?: boolean }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "number"; key: string; label: string }
  | { kind: "json"; key: string; label: string }
  | { kind: "code"; key: string; label: string; language?: string };

export interface NodeTypeDef {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  icon: any;
  color: string; // tailwind text color class
  isTrigger?: boolean;
  inputs: number;
  outputs: number | string[]; // count or named handles
  fields: FieldSchema[];
  defaults?: Record<string, any>;
}

export const NODE_TYPES: NodeTypeDef[] = [
  // ── Triggers ──
  {
    type: "trigger.manual",
    label: "Manual Trigger",
    category: "trigger",
    description: "Run on demand from the UI.",
    icon: Play,
    color: "text-primary",
    isTrigger: true,
    inputs: 0,
    outputs: 1,
    fields: [],
  },
  {
    type: "trigger.schedule",
    label: "Schedule",
    category: "trigger",
    description: "Run on a cron schedule.",
    icon: Clock,
    color: "text-primary",
    isTrigger: true,
    inputs: 0,
    outputs: 1,
    fields: [
      { kind: "text", key: "cron", label: "Cron expression", placeholder: "*/5 * * * *" },
    ],
    defaults: { cron: "*/5 * * * *" },
  },
  {
    type: "trigger.webhook",
    label: "Webhook",
    category: "trigger",
    description: "Triggered by an external HTTP call.",
    icon: Webhook,
    color: "text-primary",
    isTrigger: true,
    inputs: 0,
    outputs: 1,
    fields: [
      { kind: "text", key: "secret", label: "Optional shared secret (header x-webhook-secret)" },
    ],
  },
  {
    type: "trigger.telegram",
    label: "Telegram Message",
    category: "trigger",
    description: "Triggered by an incoming Telegram message.",
    icon: Send,
    color: "text-primary",
    isTrigger: true,
    inputs: 0,
    outputs: 1,
    fields: [
      { kind: "text", key: "match", label: "Match text (substring, blank = any)" },
    ],
  },
  {
    type: "trigger.db_event",
    label: "Database Event",
    category: "trigger",
    description: "Triggered when a row is inserted/updated.",
    icon: Database,
    color: "text-primary",
    isTrigger: true,
    inputs: 0,
    outputs: 1,
    fields: [
      { kind: "text", key: "table", label: "Table name" },
      { kind: "select", key: "event", label: "Event", options: [
        { value: "insert", label: "Insert" }, { value: "update", label: "Update" },
      ]},
    ],
    defaults: { event: "insert" },
  },

  // ── Actions ──
  {
    type: "action.http",
    label: "HTTP Request",
    category: "action",
    description: "Make an HTTP request.",
    icon: Globe,
    color: "text-emerald-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "select", key: "method", label: "Method", options: [
        { value: "GET", label: "GET" }, { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" }, { value: "PATCH", label: "PATCH" },
        { value: "DELETE", label: "DELETE" },
      ]},
      { kind: "text", key: "url", label: "URL", placeholder: "https://api.example.com/..." },
      { kind: "json", key: "headers", label: "Headers (JSON)" },
      { kind: "json", key: "body", label: "Body (JSON)" },
    ],
    defaults: { method: "GET", headers: {}, body: {} },
  },
  {
    type: "action.telegram_send",
    label: "Send Telegram",
    category: "action",
    description: "Send a Telegram message via your bot.",
    icon: Send,
    color: "text-emerald-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "text", key: "message", label: "Message", multiline: true, placeholder: "Hello {{trigger.name}}" },
    ],
  },
  {
    type: "action.create_task",
    label: "Create Task",
    category: "action",
    description: "Create a new task.",
    icon: CheckSquare,
    color: "text-emerald-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "description", label: "Description", multiline: true },
      { kind: "select", key: "priority", label: "Priority", options: [
        { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" },
      ]},
    ],
    defaults: { priority: "medium" },
  },
  {
    type: "action.create_document",
    label: "Create Document",
    category: "action",
    description: "Create a document from prior step output.",
    icon: FileText,
    color: "text-emerald-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "contentExpr", label: "Content expression", placeholder: "{{nodes.ai.content}}" },
    ],
  },
  {
    type: "action.notify",
    label: "App Notification",
    category: "action",
    description: "Push an in-app notification.",
    icon: Bell,
    color: "text-emerald-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "message", label: "Message", multiline: true },
    ],
  },
  {
    type: "action.email",
    label: "Send Email (placeholder)",
    category: "action",
    description: "Send email — wires to email provider when configured.",
    icon: Mail,
    color: "text-emerald-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "text", key: "to", label: "To" },
      { kind: "text", key: "subject", label: "Subject" },
      { kind: "text", key: "body", label: "Body", multiline: true },
    ],
  },
  {
    type: "action.n8n",
    label: "Run n8n Workflow",
    category: "integration",
    description: "Trigger a workflow in your connected n8n instance.",
    icon: Workflow,
    color: "text-purple-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "text", key: "workflow_id", label: "n8n workflow ID" },
      { kind: "json", key: "payload", label: "Payload (JSON)" },
    ],
  },

  // ── Logic ──
  {
    type: "logic.if",
    label: "If",
    category: "logic",
    description: "Branch based on a condition.",
    icon: GitBranch,
    color: "text-amber-400",
    inputs: 1,
    outputs: ["true", "false"],
    fields: [
      { kind: "text", key: "left", label: "Left expression", placeholder: "{{trigger.amount}}" },
      { kind: "select", key: "op", label: "Operator", options: [
        { value: "eq", label: "equals" }, { value: "neq", label: "not equals" },
        { value: "contains", label: "contains" }, { value: "gt", label: ">" },
        { value: "gte", label: ">=" }, { value: "lt", label: "<" }, { value: "lte", label: "<=" },
      ]},
      { kind: "text", key: "right", label: "Right value" },
    ],
    defaults: { op: "eq" },
  },
  {
    type: "logic.switch",
    label: "Switch",
    category: "logic",
    description: "Route to one of multiple outputs.",
    icon: GitBranch,
    color: "text-amber-400",
    inputs: 1,
    outputs: ["a", "b", "c", "default"],
    fields: [
      { kind: "text", key: "expr", label: "Expression to switch on" },
      { kind: "text", key: "a", label: "Match → output A" },
      { kind: "text", key: "b", label: "Match → output B" },
      { kind: "text", key: "c", label: "Match → output C" },
    ],
  },
  {
    type: "logic.transform",
    label: "Transform (JS)",
    category: "logic",
    description: "Transform data with a JS expression.",
    icon: Code2,
    color: "text-amber-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "code", key: "code", label: "function(input) { return ... }", language: "javascript" },
    ],
    defaults: { code: "return { ...input };" },
  },
  {
    type: "logic.loop",
    label: "Loop Items",
    category: "logic",
    description: "Iterate over an array.",
    icon: Repeat,
    color: "text-amber-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "text", key: "itemsExpr", label: "Items expression", placeholder: "{{trigger.items}}" },
    ],
  },
  {
    type: "logic.wait",
    label: "Wait",
    category: "logic",
    description: "Pause for N seconds.",
    icon: Timer,
    color: "text-amber-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "number", key: "seconds", label: "Seconds" },
    ],
    defaults: { seconds: 5 },
  },
  {
    type: "logic.approval",
    label: "Approval Gate",
    category: "logic",
    description: "Pause until a human approves.",
    icon: ShieldCheck,
    color: "text-amber-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "text", key: "title", label: "Approval title" },
      { kind: "text", key: "summary", label: "Summary", multiline: true },
      { kind: "select", key: "risk_level", label: "Risk", options: [
        { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" },
      ]},
    ],
    defaults: { risk_level: "medium" },
  },

  // ── AI ──
  {
    type: "ai.chat",
    label: "AI Action",
    category: "ai",
    description: "Run an AI completion on the input.",
    icon: Bot,
    color: "text-purple-400",
    inputs: 1,
    outputs: 1,
    fields: [
      { kind: "select", key: "model", label: "Model", options: [
        { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
        { value: "openai/gpt-5-mini", label: "GPT-5 mini" },
        { value: "openai/gpt-5", label: "GPT-5" },
      ]},
      { kind: "text", key: "system", label: "System prompt", multiline: true },
      { kind: "text", key: "prompt", label: "User prompt", multiline: true, placeholder: "Summarize: {{trigger.text}}" },
    ],
    defaults: { model: "google/gemini-2.5-flash", system: "You are OPTIMUS, a helpful assistant.", prompt: "{{input}}" },
  },
];

export const NODE_TYPE_MAP: Record<string, NodeTypeDef> = Object.fromEntries(
  NODE_TYPES.map((n) => [n.type, n])
);

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  trigger: "Triggers",
  action: "Actions",
  logic: "Logic",
  ai: "AI",
  integration: "Integrations",
};

export const CATEGORY_ICONS: Record<NodeCategory, any> = {
  trigger: Zap,
  action: Send,
  logic: GitBranch,
  ai: Bot,
  integration: Globe,
};