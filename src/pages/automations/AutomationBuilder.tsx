import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, useEdgesState, useNodesState, Handle, Position, useReactFlow,
  type Connection, type Edge, type Node, type NodeProps, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Play, Save, Loader2, Trash2, Search, Settings as SettingsIcon, Clock, Webhook, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NODE_TYPES, NODE_TYPE_MAP, CATEGORY_LABELS, type NodeCategory, type NodeTypeDef } from "@/lib/automation/registry";

type RFNode = Node<{ label: string; typeDef: NodeTypeDef; config: Record<string, any>; status?: string }>;

function CustomNode({ data, selected }: NodeProps<RFNode>) {
  const Icon = data.typeDef.icon;
  const outputs = Array.isArray(data.typeDef.outputs)
    ? data.typeDef.outputs
    : Array.from({ length: data.typeDef.outputs as number }, (_, i) => String(i));
  const statusBorder = data.status === "completed" ? "border-emerald-500/70" :
    data.status === "failed" ? "border-red-500/70" :
    data.status === "running" ? "border-amber-400/70 animate-pulse" : "";
  return (
    <div className={`min-w-[180px] rounded-lg border bg-card text-card-foreground shadow-md ${selected ? "border-primary" : "border-border"} ${statusBorder}`}>
      {data.typeDef.inputs > 0 && <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-border/50">
        <Icon className={`w-4 h-4 ${data.typeDef.color}`} />
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{data.typeDef.label}</div>
          <div className="text-xs font-medium truncate max-w-[140px]">{data.label}</div>
        </div>
      </div>
      {outputs.length > 1 ? (
        <div className="px-3 py-2 flex flex-col gap-1.5">
          {outputs.map((h, i) => (
            <div key={h} className="relative text-[10px] text-muted-foreground text-right pr-2">
              {h}
              <Handle type="source" position={Position.Right} id={h} style={{ top: 12 + i * 18 }} className="!bg-primary !w-2 !h-2" />
            </div>
          ))}
        </div>
      ) : outputs.length === 1 ? (
        <Handle type="source" position={Position.Right} id={outputs[0]} className="!bg-primary !w-2 !h-2" />
      ) : null}
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

function genKey() { return "n_" + Math.random().toString(36).slice(2, 10); }
function genToken() { return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join(""); }

function BuilderInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const rf = useReactFlow();
  const [wf, setWf] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<RFNode | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (id) load(); }, [id]);

  // Focus a specific node via ?focus=<node_key> (e.g. linked from trace viewer)
  useEffect(() => {
    const focusKey = searchParams.get("focus");
    if (!focusKey || nodes.length === 0) return;
    const target = nodes.find((n) => n.id === focusKey);
    if (!target) return;
    setSelected(target);
    setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === focusKey })));
    const t = setTimeout(() => {
      rf.setCenter(target.position.x + 90, target.position.y + 40, { zoom: 1.2, duration: 600 });
    }, 50);
    // Clear the param so re-clicking the same link later still scrolls.
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
    return () => clearTimeout(t);
  }, [nodes, searchParams, rf, setNodes, setSearchParams]);

  async function load() {
    const [wfRes, nRes, eRes] = await Promise.all([
      supabase.from("automation_workflows").select("*").eq("id", id).maybeSingle(),
      supabase.from("automation_nodes").select("*").eq("workflow_id", id),
      supabase.from("automation_edges").select("*").eq("workflow_id", id),
    ]);
    if (!wfRes.data) { toast({ title: "Not found", variant: "destructive" }); navigate("/automations"); return; }
    setWf(wfRes.data);
    const rfNodes: RFNode[] = (nRes.data || []).map((n: any) => {
      const typeDef = NODE_TYPE_MAP[n.type];
      if (!typeDef) return null as any;
      return {
        id: n.node_key,
        type: "custom",
        position: { x: n.position_x, y: n.position_y },
        data: { label: n.config_json?.__label || typeDef.label, typeDef, config: n.config_json || {} },
      };
    }).filter(Boolean);
    setNodes(rfNodes);
    setEdges((eRes.data || []).map((e: any) => ({
      id: e.id, source: e.source_node_key, target: e.target_node_key,
      sourceHandle: e.source_handle, targetHandle: e.target_handle,
      markerEnd: { type: MarkerType.ArrowClosed }, animated: true,
    })));
  }

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed }, animated: true }, es)), [setEdges]);

  const addNode = (typeDef: NodeTypeDef, pos?: { x: number; y: number }) => {
    const key = genKey();
    const newNode: RFNode = {
      id: key,
      type: "custom",
      position: pos || { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { label: typeDef.label, typeDef, config: { ...(typeDef.defaults || {}) } },
    };
    setNodes((ns) => [...ns, newNode]);
  };

  const updateSelectedConfig = (patch: Record<string, any>) => {
    if (!selected) return;
    setNodes((ns) => ns.map((n) => n.id === selected.id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch }, label: patch.__label ?? n.data.label } } : n));
    setSelected((s) => s ? { ...s, data: { ...s.data, config: { ...s.data.config, ...patch }, label: patch.__label ?? s.data.label } } : s);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setNodes((ns) => ns.filter((n) => n.id !== selected.id));
    setEdges((es) => es.filter((e) => e.source !== selected.id && e.target !== selected.id));
    setSelected(null);
  };

  async function save() {
    if (!wf) return;
    setSaving(true);
    try {
      // wipe + reinsert
      await supabase.from("automation_nodes").delete().eq("workflow_id", wf.id);
      await supabase.from("automation_edges").delete().eq("workflow_id", wf.id);
      if (nodes.length) {
        await supabase.from("automation_nodes").insert(nodes.map((n) => ({
          workflow_id: wf.id,
          node_key: n.id,
          type: n.data.typeDef.type,
          position_x: n.position.x,
          position_y: n.position.y,
          config_json: { ...n.data.config, __label: n.data.label },
        })));
      }
      if (edges.length) {
        await supabase.from("automation_edges").insert(edges.map((e) => ({
          workflow_id: wf.id,
          source_node_key: e.source,
          source_handle: e.sourceHandle || null,
          target_node_key: e.target,
          target_handle: e.targetHandle || null,
        })));
      }
      // update trigger_type from first trigger node
      const trig = nodes.find((n) => n.data.typeDef.isTrigger);
      const updates: any = {
        name: wf.name,
        description: wf.description,
        trigger_type: trig ? trig.data.typeDef.type.replace("trigger.", "") : "manual",
      };
      if (trig?.data.typeDef.type === "trigger.schedule") updates.schedule_cron = trig.data.config.cron || null;
      if (trig?.data.typeDef.type === "trigger.webhook" && !wf.webhook_token) updates.webhook_token = genToken();
      if (trig?.data.typeDef.type === "trigger.telegram") updates.telegram_filter = trig.data.config.match || null;
      await supabase.from("automation_workflows").update(updates).eq("id", wf.id);
      const { data } = await supabase.from("automation_workflows").select("*").eq("id", wf.id).single();
      setWf(data);
      toast({ title: "Saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function runTest() {
    if (!wf) return;
    setRunning(true);
    // reset node statuses
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, status: undefined } })));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/automation-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ workflow_id: wf.id, trigger_source: "test", input: {} }),
      });
      const result = await resp.json();
      if (result.error) toast({ title: "Run failed", description: result.error, variant: "destructive" });
      else toast({ title: `Run ${result.status}`, description: `${result.steps_executed} steps` });
      // mark statuses from result
      if (result.node_statuses) {
        setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, status: result.node_statuses[n.id] } })));
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setRunning(false); }
  }

  const filteredTypes = useMemo(() => NODE_TYPES.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()) || n.type.includes(search.toLowerCase())), [search]);
  const grouped = useMemo(() => {
    const out: Record<NodeCategory, NodeTypeDef[]> = { trigger: [], action: [], logic: [], ai: [], integration: [] };
    filteredTypes.forEach((t) => out[t.category].push(t));
    return out;
  }, [filteredTypes]);

  if (!wf) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const webhookUrl = wf.webhook_token ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/automation-webhook/${wf.webhook_token}` : null;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/50">
        <Link to="/automations" className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><ArrowLeft className="w-4 h-4" /></Link>
        <input
          value={wf.name}
          onChange={(e) => setWf({ ...wf, name: e.target.value })}
          className="bg-transparent text-sm font-semibold text-foreground border-none outline-none flex-1 max-w-md"
        />
        <div className="flex-1" />
        <button onClick={runTest} disabled={running} className="command-btn flex items-center gap-1.5 text-xs">
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Test Run
        </button>
        <Link to={`/automations/${wf.id}/runs`} className="command-btn flex items-center gap-1.5 text-xs">
          <Clock className="w-3 h-3" /> History
        </Link>
        <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left palette */}
        <div className="w-60 border-r border-border bg-card/30 flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search nodes..." className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {(Object.keys(grouped) as NodeCategory[]).map((cat) => grouped[cat].length > 0 && (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1">{CATEGORY_LABELS[cat]}</div>
                <div className="space-y-1">
                  {grouped[cat].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button key={t.type}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("application/automation-node-type", t.type)}
                        onDoubleClick={() => addNode(t)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-secondary/60 cursor-grab"
                      >
                        <Icon className={`w-3.5 h-3.5 ${t.color}`} />
                        <span className="flex-1 truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div ref={flowRef} className="flex-1 min-w-0 relative"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
          onDrop={(e) => {
            e.preventDefault();
            const t = e.dataTransfer.getData("application/automation-node-type");
            const def = NODE_TYPE_MAP[t]; if (!def) return;
            const bounds = flowRef.current?.getBoundingClientRect();
            const pos = bounds ? { x: e.clientX - bounds.left - 90, y: e.clientY - bounds.top - 30 } : undefined;
            addNode(def, pos);
          }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes as any}
            onNodeClick={(_, n) => setSelected(n as RFNode)}
            onPaneClick={() => setSelected(null)}
            fitView
            colorMode="dark"
          >
            <Background gap={16} />
            <Controls />
            <MiniMap pannable zoomable className="!bg-card !border !border-border" />
          </ReactFlow>
        </div>

        {/* Right inspector */}
        <div className="w-80 border-l border-border bg-card/30 overflow-y-auto">
          {selected ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4 text-primary" /> Node Settings
                </h3>
                <button onClick={deleteSelected} className="p-1 text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{selected.data.typeDef.label}</div>
              <p className="text-xs text-muted-foreground">{selected.data.typeDef.description}</p>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Label</label>
                <input value={selected.data.label} onChange={(e) => updateSelectedConfig({ __label: e.target.value })} className="w-full mt-1 px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:border-primary" />
              </div>
              {selected.data.typeDef.fields.map((f) => {
                const value = selected.data.config[f.key] ?? "";
                return (
                  <div key={f.key}>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</label>
                    {f.kind === "text" && !(f as any).multiline && (
                      <input value={value} onChange={(e) => updateSelectedConfig({ [f.key]: e.target.value })} placeholder={(f as any).placeholder} className="w-full mt-1 px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:border-primary" />
                    )}
                    {f.kind === "text" && (f as any).multiline && (
                      <textarea value={value} onChange={(e) => updateSelectedConfig({ [f.key]: e.target.value })} rows={4} placeholder={(f as any).placeholder} className="w-full mt-1 px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:border-primary font-mono" />
                    )}
                    {f.kind === "number" && (
                      <input type="number" value={value} onChange={(e) => updateSelectedConfig({ [f.key]: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:border-primary" />
                    )}
                    {f.kind === "select" && (
                      <select value={value} onChange={(e) => updateSelectedConfig({ [f.key]: e.target.value })} className="w-full mt-1 px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:border-primary">
                        <option value="">—</option>
                        {(f as any).options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}
                    {(f.kind === "json" || f.kind === "code") && (
                      <textarea value={typeof value === "string" ? value : JSON.stringify(value, null, 2)} onChange={(e) => {
                        if (f.kind === "json") {
                          try { updateSelectedConfig({ [f.key]: JSON.parse(e.target.value || "{}") }); }
                          catch { updateSelectedConfig({ [f.key]: e.target.value }); }
                        } else updateSelectedConfig({ [f.key]: e.target.value });
                      }} rows={6} className="w-full mt-1 px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:border-primary font-mono" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-semibold">Workflow</h3>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea value={wf.description || ""} onChange={(e) => setWf({ ...wf, description: e.target.value })} rows={3} className="w-full mt-1 px-2 py-1.5 text-xs bg-background border border-border rounded-md outline-none focus:border-primary" />
              </div>
              <div className="text-xs text-muted-foreground">Trigger: <span className="text-foreground">{wf.trigger_type}</span></div>
              {webhookUrl && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Webhook className="w-3 h-3" /> Webhook URL</label>
                  <div className="mt-1 flex items-center gap-1">
                    <code className="flex-1 px-2 py-1.5 text-[10px] bg-background border border-border rounded-md break-all">{webhookUrl}</code>
                    <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast({ title: "Copied" }); }} className="p-1.5 hover:bg-secondary rounded"><Copy className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">Click a node to edit. Drag from the palette or double-click to add.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AutomationBuilder() {
  return <ReactFlowProvider><BuilderInner /></ReactFlowProvider>;
}