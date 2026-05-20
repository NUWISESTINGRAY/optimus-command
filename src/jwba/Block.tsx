import { useEffect, useRef, useState } from "react";
import { GripVertical, CircleDot } from "lucide-react";
import { AgentChip } from "./AgentChip";

export interface BlockRow {
  id: string;
  page_id: string;
  parent_id: string | null;
  sort_order: number;
  content: string;
  block_type: string;
  agent_codename: string | null;
}

interface Props {
  block: BlockRow;
  depth: number;
  onChange: (id: string, content: string) => void;
  onEnter: (id: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  onDelete: (id: string) => void;
  onFocusPrev: (id: string) => void;
  onFocusNext: (id: string) => void;
  focusRef?: (el: HTMLDivElement | null) => void;
}

export function Block({
  block, depth, onChange, onEnter, onIndent, onOutdent, onDelete, onFocusPrev, onFocusNext, focusRef,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [local, setLocal] = useState(block.content);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== block.content) {
      ref.current.textContent = block.content;
    }
    setLocal(block.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  return (
    <div
      className="group flex items-start gap-1 py-0.5 animate-slide-up"
      style={{ paddingLeft: depth * 20 }}
    >
      <button
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity mt-1.5"
        title="Drag (coming soon)"
        type="button"
      >
        <GripVertical className="w-3 h-3" />
      </button>
      <CircleDot className="w-2 h-2 text-muted-foreground mt-2 flex-shrink-0" />
      <div className="flex-1 flex items-start gap-2 min-w-0">
        {block.agent_codename && (
          <span className="mt-1"><AgentChip codename={block.agent_codename} /></span>
        )}
        <div
          ref={(el) => { ref.current = el; focusRef?.(el); }}
          contentEditable
          suppressContentEditableWarning
          className="flex-1 outline-none text-[14px] leading-[1.7] font-mono text-foreground/90 min-h-[1.7em] caret-primary"
          onInput={(e) => {
            const v = (e.target as HTMLDivElement).textContent ?? "";
            setLocal(v);
            onChange(block.id, v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onEnter(block.id);
            } else if (e.key === "Tab") {
              e.preventDefault();
              if (e.shiftKey) onOutdent(block.id);
              else onIndent(block.id);
            } else if (e.key === "Backspace" && local === "") {
              e.preventDefault();
              onDelete(block.id);
            } else if (e.key === "ArrowUp") {
              onFocusPrev(block.id);
            } else if (e.key === "ArrowDown") {
              onFocusNext(block.id);
            }
          }}
        />
      </div>
    </div>
  );
}