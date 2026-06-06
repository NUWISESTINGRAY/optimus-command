import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Link2, Search, Upload, Plus, Radar, Check, Archive, Sparkles, Loader2, ExternalLink, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Doc = {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  source: string | null;
  source_url: string | null;
  status: string | null;
  auto: boolean | null;
  tags: string[] | null;
  created_at: string;
};

type Topic = {
  id: string;
  label: string;
  query: string;
  active: boolean;
  last_run_at: string | null;
};

const sourceStyle: Record<string, string> = {
  web: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  upload: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  research: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  meeting: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  chat: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  manual: "bg-muted text-muted-foreground border-border",
};

export default function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filter, setFilter] = useState<"active" | "archived" | "auto">("active");
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [researchQ, setResearchQ] = useState("");
  const [researching, setResearching] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: ds } = await supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(200);
    setDocs((ds ?? []) as Doc[]);
    const { data: ts } = await supabase.from("knowledge_topics").select("*").order("created_at", { ascending: false });
    setTopics((ts ?? []) as Topic[]);
  };

  useEffect(() => { load(); }, []);

  const ingestUrl = async () => {
    if (!urlInput.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("knowledge-ingest", { body: { kind: "url", url: urlInput.trim() } });
      if (error) throw error;
      toast.success("Scraped & added to Knowledge Vault");
      setUrlInput("");
      await load();
    } catch (e: any) { toast.error(e.message ?? "Failed to scrape"); }
    finally { setBusy(false); }
  };

  const ingestFile = async (file: File) => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("knowledge-uploads").upload(path, file);
      if (up.error) throw up.error;
      const { error } = await supabase.functions.invoke("knowledge-ingest", {
        body: { kind: "file", storage_path: path, mime: file.type, title: file.name },
      });
      if (error) throw error;
      toast.success(`Added ${file.name}`);
      await load();
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const addTopic = async () => {
    if (!topicInput.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("knowledge_topics").insert({ user_id: user.id, label: topicInput.slice(0, 80), query: topicInput, active: true });
    setTopicInput("");
    toast.success("Watching new topic — first results within a few hours.");
    load();
  };

  const runTopicNow = async (id: string) => {
    toast.info("Researching now…");
    const { error } = await supabase.functions.invoke("knowledge-ingest", { body: { kind: "research", topic_id: id } });
    if (error) toast.error(error.message); else { toast.success("Research complete"); load(); }
  };

  const removeTopic = async (id: string) => {
    await supabase.from("knowledge_topics").delete().eq("id", id);
    load();
  };

  const decide = async (doc: Doc, decision: "keep" | "archive") => {
    await supabase.from("documents").update({ status: decision === "keep" ? "final" : "archived" }).eq("id", doc.id);
    load();
  };

  const semanticSearch = async () => {
    if (!searchQ.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("knowledge-search", { body: { query: searchQ, limit: 6 } });
      if (error) throw error;
      setSearchResults((data as any)?.matches ?? []);
    } catch (e: any) { toast.error(e.message ?? "Search failed"); }
    finally { setSearching(false); }
  };

  const deepResearch = async () => {
    if (!researchQ.trim()) return;
    setResearching(true);
    toast.info("GPT is researching the web…");
    try {
      const { data, error } = await supabase.functions.invoke("knowledge-ingest", {
        body: { kind: "deep_research", query: researchQ.trim(), label: researchQ.trim().slice(0, 80) },
      });
      if (error) throw error;
      toast.success("Briefing added to your brain");
      setResearchQ("");
      await load();
    } catch (e: any) { toast.error(e.message ?? "Research failed"); }
    finally { setResearching(false); }
  };

  const expandDoc = async (doc: Doc) => {
    setExpanding(true);
    toast.info("GPT is expanding this document with fresh research…");
    try {
      const { error } = await supabase.functions.invoke("knowledge-ingest", {
        body: { kind: "expand", document_id: doc.id },
      });
      if (error) throw error;
      toast.success("Document updated with new findings");
      const { data: fresh } = await supabase.from("documents").select("*").eq("id", doc.id).single();
      if (fresh) setSelectedDoc(fresh as Doc);
      await load();
    } catch (e: any) { toast.error(e.message ?? "Expansion failed"); }
    finally { setExpanding(false); }
  };

  const visible = docs.filter((d) => {
    if (filter === "active") return ["active", "final", null].includes(d.status);
    if (filter === "archived") return d.status === "archived";
    if (filter === "auto") return d.auto === true;
    return true;
  });

  const counts = {
    active: docs.filter((d) => ["active", "final", null].includes(d.status)).length,
    auto: docs.filter((d) => d.auto === true).length,
    archived: docs.filter((d) => d.status === "archived").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Knowledge Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">Actively growing — scrape, watch, upload, and ask questions across everything.</p>
        </div>
      </div>

      {/* Ingest bar */}
      <div className="glass-panel p-4 grid md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2 bg-secondary/30 rounded-md px-3 py-2 border border-border">
          <Link2 className="w-4 h-4 text-cyan-400" />
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ingestUrl()}
            placeholder="Paste a URL to scrape & remember…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button onClick={ingestUrl} disabled={busy} className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Ingest
          </button>
        </div>
        <div className="flex items-center gap-2 bg-secondary/30 rounded-md px-3 py-2 border border-border">
          <Upload className="w-4 h-4 text-amber-400" />
          <input ref={fileRef} type="file" onChange={(e) => e.target.files?.[0] && ingestFile(e.target.files[0])}
            className="flex-1 text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground" />
        </div>
      </div>

      {/* Deep research */}
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">Research a topic with GPT</span>
          <span className="text-[10px] text-muted-foreground">— plans queries, scrapes the web, writes a cited briefing</span>
        </div>
        <div className="flex items-center gap-2 bg-secondary/30 rounded-md px-3 py-2 border border-border">
          <Search className="w-4 h-4 text-purple-400" />
          <input
            value={researchQ}
            onChange={(e) => setResearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && deepResearch()}
            placeholder="What do you want me to research and add to the brain?"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button onClick={deepResearch} disabled={researching} className="px-3 py-1 text-xs rounded bg-purple-500/80 text-white hover:bg-purple-500 disabled:opacity-50 flex items-center gap-1">
            {researching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Research
          </button>
        </div>
      </div>

      {/* Semantic search */}
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Ask the vault</span>
        </div>
        <div className="flex items-center gap-2 bg-secondary/30 rounded-md px-3 py-2 border border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && semanticSearch()}
            placeholder="e.g. what did we decide about pricing?"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button onClick={semanticSearch} disabled={searching} className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {searching ? "…" : "Search"}
          </button>
        </div>
        {searchResults && (
          <div className="mt-3 space-y-2">
            {searchResults.length === 0 && <p className="text-xs text-muted-foreground">No matches yet — ingest some content first.</p>}
            {searchResults.map((m: any, i: number) => (
              <div key={i} className="rounded-md border border-border p-3 bg-background/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{m.title}</span>
                  <span className="text-[10px] text-muted-foreground">{(m.similarity * 100).toFixed(0)}%</span>
                </div>
                {m.source_url && <a href={m.source_url} target="_blank" rel="noreferrer" className="text-[11px] text-cyan-400 inline-flex items-center gap-1 mt-0.5"><ExternalLink className="w-3 h-3" />{m.source_url}</a>}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{m.chunk}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist */}
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radar className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">Watchlist — daily auto-research</span>
        </div>
        <div className="flex items-center gap-2 bg-secondary/30 rounded-md px-3 py-2 border border-border mb-3">
          <input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            placeholder="Add a topic to research daily (e.g. AI agent infrastructure)…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button onClick={addTopic} className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Watch
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {topics.length === 0 && <p className="text-xs text-muted-foreground">No topics yet. Anything you add will be researched every few hours.</p>}
          {topics.map((t) => (
            <div key={t.id} className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/5 text-xs">
              <span className="text-foreground">{t.label}</span>
              <span className="text-[10px] text-muted-foreground">{t.last_run_at ? new Date(t.last_run_at).toLocaleDateString() : "queued"}</span>
              <button onClick={() => runTopicNow(t.id)} className="opacity-60 hover:opacity-100" title="Run now"><Sparkles className="w-3 h-3" /></button>
              <button onClick={() => removeTopic(t.id)} className="opacity-60 hover:opacity-100 hover:text-destructive" title="Remove"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["active", "auto", "archived"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-md border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "auto" ? "Auto-discovered" : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-2 text-[10px] opacity-70">{counts[f]}</span>
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">{visible.length} items</span>
      </div>

      {/* Docs grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((doc, i) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
            className="glass-panel p-4 flex flex-col gap-2 cursor-pointer transition-colors hover:bg-secondary/20"
            onClick={() => setSelectedDoc(doc)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{doc.title}</span>
              </div>
              {doc.source && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${sourceStyle[doc.source] ?? sourceStyle.manual}`}>
                  {doc.source}
                </span>
              )}
            </div>
            {(doc.summary || doc.content) && <p className="text-xs text-muted-foreground line-clamp-3">{doc.summary || doc.content}</p>}
            {doc.source_url && (
              <a href={doc.source_url} target="_blank" rel="noreferrer" className="text-[11px] text-cyan-400 inline-flex items-center gap-1 truncate">
                <ExternalLink className="w-3 h-3 flex-shrink-0" /><span className="truncate">{doc.source_url}</span>
              </a>
            )}
            <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/60">
              <span className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleString()}</span>
              <div className="flex items-center gap-1">
                {doc.status !== "active" && (
                  <button onClick={(e) => { e.stopPropagation(); decide(doc, "keep"); }} className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10" title="Keep">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                {doc.status !== "archived" && (
                  <button onClick={(e) => { e.stopPropagation(); decide(doc, "archive"); }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50" title="Archive">
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {visible.length === 0 && (
          <div className="glass-panel p-8 col-span-full text-center text-sm text-muted-foreground">
            Nothing here yet. Paste a URL, upload a file, or add a watchlist topic above.
          </div>
        )}
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 md:p-8" onClick={() => setSelectedDoc(null)}>
          <div className="max-w-4xl mx-auto h-full flex items-center" onClick={(e) => e.stopPropagation()}>
            <div className="glass-panel w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-start justify-between gap-4 p-5 border-b border-border/60">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground break-words">{selectedDoc.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                    <span>{new Date(selectedDoc.created_at).toLocaleString()}</span>
                    {selectedDoc.source && <span className={`px-2 py-0.5 rounded border ${sourceStyle[selectedDoc.source] ?? sourceStyle.manual}`}>{selectedDoc.source}</span>}
                    {selectedDoc.status && <span className="px-2 py-0.5 rounded border border-border bg-secondary/40 uppercase">{selectedDoc.status}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 rounded-md border border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  aria-label="Close document"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto p-5 space-y-4">
                {selectedDoc.summary && (
                  <p className="text-sm text-muted-foreground leading-6">{selectedDoc.summary}</p>
                )}

                {selectedDoc.source_url && (
                  <a href={selectedDoc.source_url} target="_blank" rel="noreferrer" className="text-sm text-cyan-400 inline-flex items-center gap-2 break-all">
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    <span>{selectedDoc.source_url}</span>
                  </a>
                )}

                <div className="rounded-md border border-border bg-background/40 p-4">
                  <pre className="whitespace-pre-wrap break-words text-sm text-foreground font-sans leading-6">{selectedDoc.content || "No document body was saved for this item."}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
