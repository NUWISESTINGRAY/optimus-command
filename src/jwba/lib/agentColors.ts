// Tailwind classes are written out in full so the JIT keeps them.
const palette = (c: string, dot: string, text: string, bg: string) => ({ bg, text, dot, hsl: c });

const P = {
  cyan: palette("hsl(188 86% 60%)", "bg-cyan-400", "text-cyan-300", "bg-cyan-500/15"),
  emerald: palette("hsl(160 84% 55%)", "bg-emerald-400", "text-emerald-300", "bg-emerald-500/15"),
  indigo: palette("hsl(239 84% 67%)", "bg-indigo-400", "text-indigo-300", "bg-indigo-500/15"),
  fuchsia: palette("hsl(292 84% 65%)", "bg-fuchsia-400", "text-fuchsia-300", "bg-fuchsia-500/15"),
  sky: palette("hsl(199 89% 60%)", "bg-sky-400", "text-sky-300", "bg-sky-500/15"),
  slate: palette("hsl(215 16% 55%)", "bg-slate-400", "text-slate-300", "bg-slate-500/15"),
  rose: palette("hsl(346 90% 65%)", "bg-rose-400", "text-rose-300", "bg-rose-500/15"),
  amber: palette("hsl(38 92% 60%)", "bg-amber-400", "text-amber-300", "bg-amber-500/15"),
  orange: palette("hsl(20 90% 60%)", "bg-orange-400", "text-orange-300", "bg-orange-500/15"),
  violet: palette("hsl(258 89% 66%)", "bg-violet-400", "text-violet-300", "bg-violet-500/15"),
  pink: palette("hsl(330 81% 68%)", "bg-pink-400", "text-pink-300", "bg-pink-500/15"),
  lime: palette("hsl(83 78% 55%)", "bg-lime-400", "text-lime-300", "bg-lime-500/15"),
  red: palette("hsl(0 80% 60%)", "bg-red-400", "text-red-300", "bg-red-500/15"),
  teal: palette("hsl(174 72% 50%)", "bg-teal-400", "text-teal-300", "bg-teal-500/15"),
  blue: palette("hsl(217 91% 60%)", "bg-blue-400", "text-blue-300", "bg-blue-500/15"),
  yellow: palette("hsl(48 96% 60%)", "bg-yellow-400", "text-yellow-300", "bg-yellow-500/15"),
};

const AGENT_PALETTE: Record<string, keyof typeof P> = {
  optimus: "cyan",
  athena: "emerald",
  cipher: "indigo",
  nova: "fuchsia",
  atlas: "sky",
  victoria: "slate",
  sentinel: "rose",
  aaron: "amber",
  mark: "orange",
  cody: "violet",
  patty: "pink",
  vicky: "lime",
  jerry: "red",
  dolly: "fuchsia",
  maya: "teal",
  angelina: "blue",
  frannie: "yellow",
};

export const AGENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = Object.fromEntries(
  Object.entries(AGENT_PALETTE).map(([code, key]) => [code, { bg: P[key].bg, text: P[key].text, dot: P[key].dot }])
);

export const AGENT_HSL: Record<string, string> = Object.fromEntries(
  Object.entries(AGENT_PALETTE).map(([code, key]) => [code, P[key].hsl])
);

const FALLBACK = P.slate;

export function agentHsl(codename?: string | null) {
  if (!codename) return FALLBACK.hsl;
  return AGENT_HSL[codename] ?? FALLBACK.hsl;
}

export function agentColor(codename?: string | null) {
  if (!codename) return { bg: FALLBACK.bg, text: FALLBACK.text, dot: FALLBACK.dot };
  return AGENT_COLORS[codename] ?? { bg: FALLBACK.bg, text: FALLBACK.text, dot: FALLBACK.dot };
}