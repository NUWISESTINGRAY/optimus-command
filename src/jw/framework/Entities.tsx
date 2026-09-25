import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { db, useEntities } from "./shared";

export default function Entities() {
  const { entities, reload } = useEntities();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("client");
  const [notes, setNotes] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await db.from("entities").insert({ name: name.trim(), kind, notes: notes || null });
    if (error) return toast.error(error.message);
    setName(""); setNotes(""); reload();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this entity? Tasks keep their data but lose the entity link; its P.U.L.S.E./PROMPTS records are deleted.")) return;
    await db.from("entities").delete().eq("id", id); reload();
  };
  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-4">
      <div className="glass-panel p-4 space-y-2">
        <h2 className="font-display font-semibold text-foreground">Add entity or client</h2>
        <p className="text-xs text-muted-foreground">The manual requires separate entity/client workspaces from day one. Use the real legal or program names.</p>
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="w-full bg-secondary rounded-md px-2 h-10 border border-border text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
          {["internal", "client", "venture", "program"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <Input placeholder="Notes (authority, contact, data rules)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={add} className="w-full">Add</Button>
      </div>
      <div className="glass-panel p-4 space-y-2">
        {entities.map((e) => (
          <div key={e.id} className="flex items-center justify-between border border-border rounded-md p-3 text-sm">
            <div><p className="text-foreground">{e.name}</p><p className="text-xs text-muted-foreground">{e.kind}{e.notes ? ` · ${e.notes}` : ""}</p></div>
            <button onClick={() => remove(e.id)}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
          </div>
        ))}
        {!entities.length && <p className="text-sm text-muted-foreground">No entities yet. Tasks can't be activated until they're scoped to one.</p>}
      </div>
    </div>
  );
}
