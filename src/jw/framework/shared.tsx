import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const db = supabase as any;

export function useEntities() {
  const [entities, setEntities] = useState<any[]>([]);
  const reload = async () => {
    const { data } = await db.from("entities").select("*").order("name");
    setEntities(data ?? []);
  };
  useEffect(() => { reload(); }, []);
  return { entities, reload };
}

export function EntitySelect({ value, onChange, entities, allowAll = true, placeholder = "All entities / portfolio" }:
  { value: string | null; onChange: (v: string | null) => void; entities: any[]; allowAll?: boolean; placeholder?: string }) {
  return (
    <Select value={value ?? "__all"} onValueChange={(v) => onChange(v === "__all" ? null : v)}>
      <SelectTrigger className="w-[240px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="__all">{placeholder}</SelectItem>}
        {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} · {e.kind}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none prose-headings:font-display prose-table:text-xs prose-th:border prose-th:border-border prose-td:border prose-td:border-border prose-th:px-2 prose-td:px-2 prose-a:text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  active: "Active", definition_pending: "Definition pending", draft: "Draft", retired: "Retired",
};
