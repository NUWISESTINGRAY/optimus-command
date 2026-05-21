import { useMemo, useState } from "react";
import { Sparkles, Plus, Minus, ArrowRight } from "lucide-react";

type DiffKind = "added" | "removed" | "changed" | "unchanged";
interface DiffRow {
  path: string;
  kind: DiffKind;
  before?: any;
  after?: any;
  important: boolean;
  score: number;
}

// Fields commonly worth surfacing first
const IMPORTANT_KEYS = new Set([
  "id", "status", "error", "message", "content", "text", "result",
  "output", "response", "body", "title", "url", "code", "amount",
  "email", "to", "from", "subject", "name", "ok", "success",
]);

function isObj(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function fmt(v: any): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return v.length > 120 ? v.slice(0, 117) + "…" : v;
  try {
    const s = JSON.stringify(v);
    return s.length > 120 ? s.slice(0, 117) + "…" : s;
  } catch {
    return String(v);
  }
}

function scoreRow(path: string, kind: DiffKind, before: any, after: any): number {
  const leaf = path.split(".").pop()?.replace(/\[\d+\]$/, "") ?? "";
  let s = 0;
  if (IMPORTANT_KEYS.has(leaf.toLowerCase())) s += 5;
  if (kind === "added") s += 2;
  if (kind === "removed") s += 2;
  if (kind === "changed") s += 3;
  // size of change
  const len = (v: any) => (typeof v === "string" ? v.length : JSON.stringify(v ?? "").length);
  const delta = Math.abs(len(after) - len(before));
  if (delta > 200) s += 2;
  if (/error|fail/i.test(leaf)) s += 4;
  return s;
}

function diffValues(before: any, after: any, path = "", out: DiffRow[] = []): DiffRow[] {
  if (isObj(before) && isObj(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    for (const k of keys) {
      const p = path ? `${path}.${k}` : k;
      const a = (before as any)[k];
      const b = (after as any)[k];
      if (!(k in before)) {
        out.push({ path: p, kind: "added", after: b, important: false, score: scoreRow(p, "added", undefined, b) });
      } else if (!(k in after)) {
        out.push({ path: p, kind: "removed", before: a, important: false, score: scoreRow(p, "removed", a, undefined) });
      } else if (isObj(a) && isObj(b)) {
        diffValues(a, b, p, out);
      } else if (Array.isArray(a) && Array.isArray(b)) {
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          out.push({ path: p, kind: "changed", before: a, after: b, important: false, score: scoreRow(p, "changed", a, b) });
        } else {
          out.push({ path: p, kind: "unchanged", before: a, after: b, important: false, score: 0 });
        }
      } else if (JSON.stringify(a) !== JSON.stringify(b)) {
        out.push({ path: p, kind: "changed", before: a, after: b, important: false, score: scoreRow(p, "changed", a, b) });
      } else {
        out.push({ path: p, kind: "unchanged", before: a, after: b, important: false, score: 0 });
      }
    }
    return out;
  }
  // top-level non-object
  const p = path || "(root)";
  if (JSON.stringify(before) === JSON.stringify(after)) {
    out.push({ path: p, kind: "unchanged", before, after, important: false, score: 0 });
  } else if (before === undefined) {
    out.push({ path: p, kind: "added", after, important: false, score: scoreRow(p, "added", undefined, after) });
  } else if (after === undefined) {
    out.push({ path: p, kind: "removed", before, important: false, score: scoreRow(p, "removed", before, undefined) });
  } else {
    out.push({ path: p, kind: "changed", before, after, important: false, score: scoreRow(p, "changed", before, after) });
  }
  return out;
}

export default function NodeDiff({ input, output }: { input: any; output: any }) {
  const [showUnchanged, setShowUnchanged] = useState(false);

  const { rows, counts, topImportant } = useMemo(() => {
    const all = diffValues(input ?? {}, output ?? {});
    // mark top-N highest scoring as important
    const ranked = [...all].filter((r) => r.kind !== "unchanged").sort((a, b) => b.score - a.score);
    const topSet = new Set(ranked.slice(0, Math.min(5, ranked.length)).filter((r) => r.score >= 3).map((r) => r.path));
    all.forEach((r) => (r.important = topSet.has(r.path)));
    const counts = {
      added: all.filter((r) => r.kind === "added").length,
      removed: all.filter((r) => r.kind === "removed").length,
      changed: all.filter((r) => r.kind === "changed").length,
      unchanged: all.filter((r) => r.kind === "unchanged").length,
    };
    return { rows: all, counts, topImportant: ranked.slice(0, 3) };
  }, [input, output]);

  const visible = rows.filter((r) => showUnchanged || r.kind !== "unchanged");

  if (rows.length === 0) {
    return <div className="text-[11px] text-muted-foreground p-3 bg-background/50 rounded">No data to diff.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center flex-wrap gap-2 text-[10px]">
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
          <Plus className="w-2.5 h-2.5" />{counts.added} added
        </span>
        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 inline-flex items-center gap-1">
          <Minus className="w-2.5 h-2.5" />{counts.removed} removed
        </span>
        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
          <ArrowRight className="w-2.5 h-2.5" />{counts.changed} changed
        </span>
        <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
          {counts.unchanged} unchanged
        </span>
        <label className="ml-auto flex items-center gap-1 text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)} className="accent-primary" />
          show unchanged
        </label>
      </div>

      {topImportant.length > 0 && (
        <div className="rounded border border-primary/30 bg-primary/5 p-2">
          <div className="text-[10px] uppercase text-primary flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3" />Key changes
          </div>
          <div className="space-y-1">
            {topImportant.map((r) => (
              <div key={`k-${r.path}`} className="text-[11px] font-mono flex items-start gap-2">
                <span className="text-primary shrink-0">{r.path}</span>
                <span className="text-muted-foreground truncate">
                  {r.kind === "added" ? `→ ${fmt(r.after)}` : r.kind === "removed" ? `${fmt(r.before)} →` : `${fmt(r.before)} → ${fmt(r.after)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded border border-border bg-background/50 overflow-hidden max-h-80 overflow-y-auto">
        <table className="w-full text-[11px] font-mono">
          <tbody>
            {visible.map((r, i) => {
              const baseRow = r.important ? "bg-primary/5" : i % 2 ? "bg-background/30" : "";
              return (
                <tr key={`${r.path}-${i}`} className={`align-top border-b border-border/40 last:border-b-0 ${baseRow}`}>
                  <td className="px-2 py-1.5 w-6 text-center">
                    {r.kind === "added" && <Plus className="w-3 h-3 text-emerald-400 inline" />}
                    {r.kind === "removed" && <Minus className="w-3 h-3 text-red-400 inline" />}
                    {r.kind === "changed" && <ArrowRight className="w-3 h-3 text-amber-400 inline" />}
                    {r.kind === "unchanged" && <span className="text-muted-foreground">·</span>}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <span className={r.important ? "text-primary font-semibold" : "text-foreground"}>{r.path}</span>
                    {r.important && <Sparkles className="w-2.5 h-2.5 text-primary inline ml-1" />}
                  </td>
                  <td className="px-2 py-1.5 text-red-400/90 break-all max-w-xs">
                    {r.kind === "added" ? <span className="text-muted-foreground">—</span> : fmt(r.before)}
                  </td>
                  <td className="px-2 py-1.5 w-4 text-muted-foreground">→</td>
                  <td className="px-2 py-1.5 text-emerald-400/90 break-all max-w-xs">
                    {r.kind === "removed" ? <span className="text-muted-foreground">—</span> : fmt(r.after)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}