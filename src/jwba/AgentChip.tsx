import { agentColor } from "./lib/agentColors";

export function AgentChip({ codename }: { codename: string }) {
  const c = agentColor(codename);
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {codename}
    </span>
  );
}