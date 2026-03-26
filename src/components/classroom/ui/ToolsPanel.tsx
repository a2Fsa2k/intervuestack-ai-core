import { X } from "lucide-react";
import type { ToolType } from "@/lib/tools.domain";

interface ToolsPanelProps {
  isOpen: boolean;
  openTools: ToolType[];
  onOpenTool: (tool: ToolType) => void;
  onClose: () => void;
}

export function ToolsPanel({ isOpen, openTools, onOpenTool, onClose }: ToolsPanelProps) {
  if (!isOpen) {
    return null;
  }

  const allTools: ToolType[] = ["code_editor", "whiteboard"];
  const availableTools = allTools.filter((tool) => !openTools.includes(tool));

  return (
    <div className="bg-[#0a0a0a] border-t border-[#1a1a1a] p-2">
      <div className="flex items-center gap-1 flex-wrap">
        {availableTools.length === 0 ? (
          <span className="text-xs text-gray-500">All enabled tools are already open</span>
        ) : (
          availableTools.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => onOpenTool(tool)}
              className="flex items-center gap-1.5 px-3 py-1.5 border text-xs transition-colors bg-[#0a0a0a] border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a] hover:border-[#3a3a3a]"
            >
              {tool === "code_editor" ? "Code Editor" : "Whiteboard"}
            </button>
          ))
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto px-2 py-1.5 border border-[#2a2a2a] text-gray-400 hover:bg-[#1a1a1a] hover:border-[#3a3a3a] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
