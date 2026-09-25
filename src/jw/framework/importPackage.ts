import { supabase } from "@/integrations/supabase/client";
import manualMd from "@/data/jw/JW_Framework_Operating_Manual.md?raw";
import specMd from "@/data/jw/JW_Agent_and_Workflow_Specifications.md?raw";
import backlog from "@/data/jw/JW_Framework_Task_Backlog.json";

const db = supabase as any;
export const PACKAGE_VERSION = "1.0";
export const SOURCE_REF = "JW Framework Implementation Package v1.0 (2026-09-25)";
export const BACKLOG_BATCH_NAME = "JW Framework Backlog v1.0";

export const PULSE_PILLARS = [
  { key: "P", label: "People and Purpose" },
  { key: "U", label: "Unified Vision and Culture" },
  { key: "L", label: "Leadership and Governance" },
  { key: "S", label: "Systems Stewardship and Service" },
  { key: "E", label: "Execution Evaluation and Evolution" },
];
export const PROMPTS_LEVELS = [
  { key: "P", label: "Pick" },
  { key: "R", label: "Refine" },
  { key: "O", label: "Operate" },
  { key: "M", label: "Make" },
  { key: "P2", label: "Productize" },
  { key: "T", label: "Trigger" },
  { key: "S", label: "Synthesize" },
];

// Persona that supports (drafts for) each governance role. Humans remain accountable.
export const ROLE_TO_PERSONA: Record<string, string> = {
  "Executive Sponsor": "optimus",
  "Framework Product Owner": "atlas",
  "PULSE Steward": "maya",
  "Delivery Lead": "angelina",
  "Revenue Lead": "victoria",
  "Finance Lead": "athena",
  "AI Governance Lead": "cipher",
  "Security Data Lead": "cody",
  "Operations Lead": "atlas",
  "Quality Lead": "sentinel",
  "Brand Method Owner": "nova",
  "Certification Lead": "dolly",
  "Program Director": "sentinel",
  "Ministry Program Owner": "frannie",
  "Nonprofit Program Owner": "jerry",
  "Blitz Program Executive": "vicky",
};
const AGENT_SPEC_TO_PERSONA: Record<string, string> = {
  "Portfolio Orchestrator": "optimus",
  "Intake Agent": "mark",
  "Research Agent": "aaron",
  "Diagnostic Agent": "maya",
  "Strategy Agent": "nova",
  "Operations Agent": "atlas",
  "Revenue Agent": "victoria",
  "AI Architecture Agent": "cipher",
  "Quality Agent": "sentinel",
  "Client Success Agent": "dolly",
  "Sector Support Agent": "frannie",
};

type Section = { heading: string; body: string };
function splitH2(md: string): { preamble: string; sections: Section[] } {
  const parts = md.split(/^## /m);
  const preamble = parts.shift() ?? "";
  return {
    preamble,
    sections: parts.map((p) => {
      const nl = p.indexOf("\n");
      return { heading: p.slice(0, nl).trim(), body: p.slice(nl + 1).trim() };
    }),
  };
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Entry = {
  kind: "framework" | "sop" | "manual" | "spec";
  code: string; name: string; content: string; status?: string;
  layer?: string; owner_role?: string; category?: string; sort_order: number;
};

function ownerOf(body: string) {
  const m = body.match(/\*\*Owner:\*\*\s*([^;.*]+)/);
  return m?.[1]?.trim();
}

export function buildEntries(): { entries: Entry[]; workflows: Section[]; agentRows: string[][] } {
  const entries: Entry[] = [];
  const man = splitH2(manualMd);
  const recovery = man.sections.find((s) => /Recovery SOP/.test(s.heading))?.body ?? "";

  entries.push({ kind: "manual", code: "MAN-00", name: "Front matter and executive direction", sort_order: 0,
    content: man.preamble.trim() + "\n\n## Executive direction\n\n" + (man.sections.find((s) => s.heading === "Executive direction")?.body ?? "") });
  man.sections.forEach((s, i) => {
    if (s.heading === "Executive direction") return;
    const sop = s.heading.match(/^\d+\s+SOP\s+(\d+)\s+(.*)$/);
    if (sop) {
      entries.push({ kind: "sop", code: `SOP-${sop[1]}`, name: `SOP ${sop[1]} — ${sop[2]}`, content: `## ${s.heading}\n\n${s.body}`,
        owner_role: ownerOf(s.body), sort_order: Number(sop[1]) });
    } else {
      const num = s.heading.match(/^(\d+)\s+(.*)$/);
      const app = s.heading.match(/^Appendix\s+([A-Z])\s+(.*)$/);
      entries.push({
        kind: "manual",
        code: num ? `MAN-${num[1].padStart(2, "0")}` : app ? `MAN-APP-${app[1]}` : `MAN-${i}`,
        name: num ? `§${num[1]} ${num[2]}` : app ? `Appendix ${app[1]} — ${app[2]}` : s.heading,
        content: `## ${s.heading}\n\n${s.body}`,
        sort_order: num ? Number(num[1]) : 100 + i,
      });
    }
  });

  const spec = splitH2(specMd);
  const workflows = spec.sections.filter((s) => /^Workflow W\d+/.test(s.heading));
  entries.push({ kind: "spec", code: "SPEC-00", name: "Agent and Workflow Specifications — full document", content: specMd, sort_order: 0 });
  spec.sections.forEach((s, i) => {
    entries.push({ kind: "spec", code: /^Workflow (W\d+)/.test(s.heading) ? s.heading.match(/W\d+/)![0] : `SPEC-${String(i + 1).padStart(2, "0")}`,
      name: s.heading, content: `## ${s.heading}\n\n${s.body}`, sort_order: i + 1 });
  });

  const registry = spec.sections.find((s) => s.heading.startsWith("Registry of proposed agents"))?.body ?? "";
  const agentRows = registry.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Agent") && !l.startsWith("| ---"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

  // Framework registry
  const arch = man.sections.find((s) => s.heading.startsWith("2 Framework architecture"))?.body ?? "";
  const row = (name: string) => arch.split("\n").find((l) => l.includes(name)) ?? "";
  const confirmed = (code: string, name: string, layer: string, owner: string, extra: string, sort: number): Entry => ({
    kind: "framework", code, name, layer, owner_role: owner, status: "active", sort_order: sort,
    content: `# ${name}\n\n**Status:** Active (source-confirmed). **Layer:** ${layer}. **Accountable role:** ${owner}.\n\n${extra}\n\n### Architecture reference\n\n| Layer | Framework or system | What it decides | Human accountable role | Main evidence |\n| --- | --- | --- | --- | --- |\n${row(name.split(" (")[0]) || "| — | — | — | — | — |"}\n\n_Source: ${SOURCE_REF}._`,
  });
  const pending = (code: string, name: string, sort: number, note = ""): Entry => ({
    kind: "framework", code, name, layer: "Modules", owner_role: "Framework Product Owner", status: "definition_pending", sort_order: sort,
    content: `# ${name}\n\n**Status: DEFINITION PENDING.** ${note}The implementation package states that this method's exact definition requires source recovery and owner approval. Do not fill acronym letters from memory, market it as certified, or permit agents to improvise its steps.\n\nRecovery tasks: T004 (PASSION) and T005 (5P, Kingdom Brand, AOS-12, CARRYOUT).\n\n## Recovery SOP for incomplete methods\n\n${recovery}\n\n_Source: ${SOURCE_REF}._`,
  });
  entries.push(
    confirmed("FW-MASTER", "JW Brand Master Framework System", "Portfolio", "Framework Product Owner", "Portfolio architecture: canonical names, versions, placement and product priorities. Three commercial flagships: Execution Method, Enterprise Agentic AI Operating Framework, Revenue and Funding.", 1),
    confirmed("FW-PULSE", "P.U.L.S.E.", "Operations", "Executive Sponsor and P.U.L.S.E. Steward",
      "Canonical pillar labels:\n\n" + PULSE_PILLARS.map((p) => `- **${p.key}** — ${p.label}`).join("\n") + "\n\nEarlier shorthand (People, Unity, Leadership, Systems, Execution) is historical only. Procedures: SOP 02 (assessment) and SOP 03 (management cadence).", 2),
    confirmed("FW-PROMPTS", "PROMPTS", "AI maturity", "AI Product Owner",
      "Seven maturity levels:\n\n" + PROMPTS_LEVELS.map((p, i) => `${i + 1}. **${p.label}**`).join("\n") + "\n\nProcedure: SOP 07 (PROMPTS maturity and AI use-case intake).", 3),
    confirmed("FW-EAAOF", "Enterprise Agentic AI Operating Framework", "Assurance", "AI Governance Lead plus control owners", "Risk, data, security, AI and resilience gates; sixteen assurance disciplines; risk tiers 1–4. Procedures: SOP 08 and SOP 09.", 4),
    confirmed("FW-EXEC", "JW Brand Execution Method", "Transformation", "Delivery Lead", "Five gates: Clarify Vision → Build the Brand → Engineer the System → Launch → Scale. Procedure: SOP 04.", 5),
    confirmed("FW-REV", "Revenue and Funding System", "Growth", "Revenue Lead with Finance", "Offer economics, pipeline, sponsor and grant processes. Procedure: SOP 06.", 6),
    confirmed("FW-CREATE-BD", "CREATE Brand Development", "Modules", "Brand Method Owner", "Confirmed at sequence level by the master source. Detailed module card is produced by task T019.", 10),
    confirmed("FW-CREATE-MK", "CREATE Marketing", "Modules", "Brand Method Owner", "Confirmed at sequence level; distinct from CREATE Brand Development. Module card via T019.", 11),
    confirmed("FW-CLEAR", "CLEAR", "Modules", "Brand Method Owner", "Confirmed at sequence level. Module card via T019.", 12),
    confirmed("FW-BRAND", "BRAND", "Modules", "Brand Method Owner", "Confirmed at sequence level. Module card via T019.", 13),
    confirmed("FW-5C", "5Cs", "Modules", "Brand Method Owner", "Confirmed at sequence level. Module card via T019.", 14),
    confirmed("FW-CERT", "Certification and licensing", "Multiplication", "Certification Lead and legal authority", "Only fully defined methods may enter certification. Procedure: SOP 11.", 15),
    pending("FW-PASSION", "PASSION", 20, "The seven exact stage definitions are not confirmed. "),
    pending("FW-5P", "5P", 21),
    pending("FW-KBA", "Kingdom Brand Architecture", 22, "The final sequence is not confirmed. "),
    pending("FW-AOS12", "AOS-12", 23),
    pending("FW-CARRYOUT", "CARRYOUT", 24),
    pending("FW-SUPERMEGA", "Super Mega controls (detailed)", 25, "Detail beyond the P.U.L.S.E./PROMPTS mapping is not confirmed. "),
  );
  return { entries, workflows, agentRows };
}

const PRIORITY: Record<string, string> = { P0: "critical", P1: "high", P2: "medium", P3: "low" };
export const toTaskPriority = (p?: string | null) => PRIORITY[p ?? ""] ?? "medium";

export async function importPackage(userId: string, log: (m: string) => void = () => {}) {
  const { entries, workflows, agentRows } = buildEntries();

  // Library entries (idempotent by kind+slug)
  const { data: existing } = await db.from("frameworks").select("kind, slug");
  const have = new Set((existing ?? []).map((e: any) => `${e.kind}:${e.slug}`));
  let created = 0;
  for (const e of entries) {
    const slug = slugify(e.code);
    if (have.has(`${e.kind}:${slug}`)) continue;
    const { data: f, error } = await db.from("frameworks").insert({
      user_id: userId, kind: e.kind, slug, code: e.code, name: e.name, status: e.status ?? "active",
      layer: e.layer ?? null, owner_role: e.owner_role ?? null, category: e.category ?? null,
      source_ref: SOURCE_REF, sort_order: e.sort_order,
    }).select("id").single();
    if (error) throw error;
    const { error: ve } = await db.from("framework_versions").insert({
      user_id: userId, framework_id: f.id, version: 1, content: e.content, change_notes: `Imported from ${SOURCE_REF}`,
    });
    if (ve) throw ve;
    created++;
  }
  log(`Library: ${created} new entries (${entries.length} total in package)`);

  // Role mappings
  const roleRows = [
    ...agentRows.map(([name, mission, inputs, output, boundary]) => ({
      user_id: userId, role_name: name, role_kind: "agent_spec", mission, inputs, output,
      boundary: boundary?.split(";")[0]?.trim(), human_owner: boundary?.split(";")[1]?.trim(),
      mapped_codename: AGENT_SPEC_TO_PERSONA[name] ?? null,
    })),
    ...Object.entries(ROLE_TO_PERSONA).map(([name, code]) => ({
      user_id: userId, role_name: name, role_kind: "human_role", mapped_codename: code,
      mission: "Human-accountable governance role. The mapped persona may draft and support only; a named person must be assigned.",
    })),
  ];
  await db.from("jw_role_mappings").upsert(roleRows, { onConflict: "user_id,role_name", ignoreDuplicates: true });
  log(`Roles: ${roleRows.length} role/agent mappings`);

  // Workflow drafts — always inactive, manual trigger, no steps
  const { data: wfs } = await supabase.from("atlas_workflows").select("name");
  const wfHave = new Set((wfs ?? []).map((w) => w.name));
  let wfCreated = 0;
  for (const w of workflows) {
    const name = `JW ${w.heading.replace(/^Workflow /, "")}`;
    if (wfHave.has(name)) continue;
    const { error } = await supabase.from("atlas_workflows").insert({
      user_id: userId, name, description: w.body, status: "draft", active: false, trigger_type: "manual",
    });
    if (error) throw error;
    wfCreated++;
  }
  log(`Workflows: ${wfCreated} new inactive drafts`);

  // Backlog — staged only, never inserted into tasks here
  const { data: batch0 } = await db.from("task_import_batches").select("id").eq("name", BACKLOG_BATCH_NAME).maybeSingle();
  if (!batch0) {
    const b: any = backlog;
    const { data: batch, error } = await db.from("task_import_batches").insert({
      user_id: userId, name: BACKLOG_BATCH_NAME, source: "JW_Framework_Task_Backlog.json",
      package_version: b.package_version, instruction: b.instruction,
    }).select("id").single();
    if (error) throw error;
    const rows = b.tasks.map((t: any, i: number) => ({
      user_id: userId, batch_id: batch.id, external_id: t.id, title: t.title, description: null,
      priority: t.priority, framework_ref: t.framework, status: "proposed", phase_days: t.phase_days,
      owner_role: t.owner_role, due_offset_days: t.due_offset_days_from_kickoff, dependencies: t.dependencies ?? [],
      deliverable: t.deliverable, acceptance_criteria: t.acceptance_criteria, approval_role: t.approval_role,
      automation_mode: t.automation_mode, assignee_name: null, assignee_agent: null, entity_id: null,
      evidence_links: t.evidence_link ? [t.evidence_link] : [], sort_order: i,
    }));
    const { error: ie } = await db.from("task_import_items").insert(rows);
    if (ie) throw ie;
    log(`Backlog: ${rows.length} tasks staged as proposed (unassigned)`);
  } else log("Backlog: already imported");
}
