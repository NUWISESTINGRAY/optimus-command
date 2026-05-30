import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Paperclip,
  Mic,
  Sparkles,
  FileText,
  CheckSquare,
  ExternalLink,
  Bot,
  User,
  ChevronRight,
  Loader2,
  Plus,
  MessageSquare,
  Volume2,
  Square,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const modes = [
  "Auto", "COO", "CMO", "CFO", "CTO", "CRO", "HR", "Research", "Executive Assistant", "Chief of Staff"
];

const suggestions = [
  "Draft a board update email",
  "Create a project plan for Q2 hiring",
  "Analyze competitor pricing strategy",
  "Summarize yesterday's meeting notes",
];

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  mode?: string;
  metadata?: any;
  citations_json?: string[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimus-chat`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/optimus-tts`;

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState("Auto");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playOptimusVoice = async (text: string, idx: number) => {
    if (playingIdx === idx && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingIdx(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setLoadingIdx(idx);
    try {
      const r = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(`TTS failed: ${r.status}`);
      const { audioBase64 } = await r.json();
      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
      audioRef.current = audio;
      setPlayingIdx(idx);
      audio.onended = () => { setPlayingIdx(null); audioRef.current = null; };
      await audio.play();
    } catch (e: any) {
      toast({ title: "Voice unavailable", description: e.message, variant: "destructive" });
      setPlayingIdx(null);
    } finally {
      setLoadingIdx(null);
    }
  };

  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("chat_sessions")
      .select("id, title, mode, created_at")
      .order("updated_at", { ascending: false })
      .limit(20);
    if (data) setSessions(data);
  };

  const loadSession = async (sid: string) => {
    setSessionId(sid);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    if (data) setMessages(data.map((m: any) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      mode: m.mode,
      metadata: m.metadata,
      citations_json: m.citations_json,
    })));
  };

  const newSession = () => {
    setSessionId(null);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: currentInput,
          session_id: sessionId,
          mode: activeMode,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      // Capture session ID from response headers
      const newSessionId = resp.headers.get("X-Session-Id");
      const modeUsed = resp.headers.get("X-Mode-Used") || activeMode;
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId);
        loadSessions();
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        // Strip optimus-meta tags from display
        const displayContent = assistantSoFar.replace(/<optimus-meta>[\s\S]*?<\/optimus-meta>/, "").trim();
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: displayContent, mode: modeUsed } : m));
          }
          return [...prev, { role: "assistant", content: displayContent, mode: modeUsed }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setMessages((prev) => prev.filter((m) => m !== userMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Extract metadata from the last assistant message
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const metadata = lastAssistant?.metadata || {};

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Session Sidebar */}
      <div className="hidden md:flex w-56 border-r border-border flex-col bg-background/50">
        <div className="p-3 border-b border-border">
          <button onClick={newSession} className="w-full command-btn flex items-center gap-2 text-xs justify-center">
            <Plus className="w-3 h-3" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs truncate transition-colors ${
                sessionId === s.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <MessageSquare className="w-3 h-3 inline mr-1.5" />
              {s.title || "Untitled"}
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mode Selector */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-2 overflow-x-auto">
          {modes.map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                activeMode === mode
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-semibold text-foreground">OPTIMUS Ready</h2>
                  <p className="text-sm text-muted-foreground mt-1">Select a mode and start a conversation</p>
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-2xl ${msg.role === "user" ? "order-first" : ""}`}>
                {msg.role === "assistant" && msg.mode && (
                  <div className="text-[10px] text-primary font-medium tracking-wider uppercase mb-1.5">
                    OPTIMUS · {msg.mode} Mode
                  </div>
                )}
                <div className={`rounded-lg p-4 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 text-foreground"
                    : "glass-panel text-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-line">{msg.content}</div>
                  )}
                </div>
                {msg.role === "assistant" && msg.content?.trim() && (
                  <button
                    onClick={() => playOptimusVoice(msg.content, i)}
                    disabled={loadingIdx === i}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md border border-border/50 hover:border-primary/40"
                  >
                    {loadingIdx === i ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Synthesizing…</>
                    ) : playingIdx === i ? (
                      <><Square className="w-3 h-3" /> Stop</>
                    ) : (
                      <><Volume2 className="w-3 h-3" /> Play in Optimus's voice</>
                    )}
                  </button>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
              <div className="glass-panel px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3 text-primary" />
                  OPTIMUS is thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 0 && (
          <div className="px-6 pb-2">
            <div className="flex gap-2 flex-wrap">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-border/50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 glass-panel p-2 rounded-lg">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Optimus anything..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              disabled={isLoading}
            />
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Context Panel */}
      <div className="hidden lg:flex w-80 border-l border-border flex-col bg-background/50">
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-medium text-muted-foreground tracking-wider uppercase">Intelligence Panel</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Sources */}
          {lastAssistant?.citations_json && lastAssistant.citations_json.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Cited Sources
              </h4>
              <div className="space-y-2">
                {lastAssistant.citations_json.map((src: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border/50">
                    <span className="text-xs text-foreground">{src}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {metadata.suggested_actions?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5" />
                Suggested Actions
              </h4>
              <div className="space-y-2">
                {metadata.suggested_actions.map((action: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/50 text-xs text-foreground">
                    <ChevronRight className="w-3 h-3 text-primary" />
                    {action}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Mode */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Active Mode
            </h4>
            <div className="p-3 rounded-md bg-primary/5 border border-primary/15">
              <div className="text-sm font-medium text-primary">{activeMode}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeMode === "Auto" ? "Automatically selects the best mode for your request." : `Optimized for ${activeMode.toLowerCase()} operations.`}
              </p>
            </div>
          </div>

          {/* Confidence */}
          {metadata.confidence && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3">Confidence</h4>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(metadata.confidence * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{Math.round(metadata.confidence * 100)}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
