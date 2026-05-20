export const AGENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  optimus: { bg: "bg-sky-500/15", text: "text-sky-300", dot: "bg-sky-400" },
  atlas: { bg: "bg-indigo-500/15", text: "text-indigo-300", dot: "bg-indigo-400" },
  mercury: { bg: "bg-emerald-500/15", text: "text-emerald-300", dot: "bg-emerald-400" },
  apollo: { bg: "bg-amber-500/15", text: "text-amber-300", dot: "bg-amber-400" },
  hermes: { bg: "bg-violet-500/15", text: "text-violet-300", dot: "bg-violet-400" },
  iris: { bg: "bg-rose-500/15", text: "text-rose-300", dot: "bg-rose-400" },
  vulcan: { bg: "bg-orange-500/15", text: "text-orange-300", dot: "bg-orange-400" },
  nyx: { bg: "bg-slate-500/15", text: "text-slate-300", dot: "bg-slate-400" },
  orion: { bg: "bg-cyan-500/15", text: "text-cyan-300", dot: "bg-cyan-400" },
  helios: { bg: "bg-yellow-500/15", text: "text-yellow-300", dot: "bg-yellow-400" },
  selene: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-300", dot: "bg-fuchsia-400" },
};

export function agentColor(codename?: string | null) {
  if (!codename) return AGENT_COLORS.nyx;
  return AGENT_COLORS[codename] ?? AGENT_COLORS.nyx;
}