import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export async function getOrCreateDailyPage(date: string, userId: string) {
  const { data: existing } = await supabase
    .from("jwba_pages")
    .select("*")
    .eq("tenant_id", userId)
    .eq("daily_date", date)
    .maybeSingle();
  if (existing) return existing;
  const title = format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy");
  const { data, error } = await supabase
    .from("jwba_pages")
    .insert({ tenant_id: userId, title, is_daily: true, daily_date: date })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function nextSortOrder(existing: number[], after?: number) {
  if (after !== undefined) {
    const sorted = [...existing].sort((a, b) => a - b);
    const idx = sorted.indexOf(after);
    const next = sorted[idx + 1];
    if (next === undefined) return after + 1;
    return (after + next) / 2;
  }
  return (Math.max(0, ...existing) || 0) + 1;
}

export function extractRefs(content: string) {
  const pages = Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g)).map((m) => m[1]);
  const blocks = Array.from(content.matchAll(/\(\(([0-9a-f-]{36})\)\)/g)).map((m) => m[1]);
  return { pages, blocks };
}

export async function syncBlockRefs(sourceBlockId: string, content: string, tenantId: string) {
  const { pages, blocks } = extractRefs(content);
  await supabase.from("jwba_block_refs").delete().eq("source_block_id", sourceBlockId);
  const rows: any[] = [];
  for (const title of pages) {
    const { data: page } = await supabase
      .from("jwba_pages")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("title", title)
      .maybeSingle();
    let pageId = page?.id;
    if (!pageId) {
      const { data: created } = await supabase
        .from("jwba_pages")
        .insert({ tenant_id: tenantId, title })
        .select("id")
        .single();
      pageId = created?.id;
    }
    if (pageId) rows.push({ source_block_id: sourceBlockId, target_page_id: pageId, ref_type: "page" });
  }
  for (const bid of blocks) {
    rows.push({ source_block_id: sourceBlockId, target_block_id: bid, ref_type: "block" });
  }
  if (rows.length) await supabase.from("jwba_block_refs").insert(rows);
}