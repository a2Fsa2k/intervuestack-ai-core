import type { ToolType as DomainToolType } from "@/lib/tools.domain";
import type { ToolType } from "../../runtime/types";
import { getToolComponent } from "../../tools/registry";

interface ToolPanelProps {
  activeTool: ToolType;
  openTools: DomainToolType[];
}

export function ToolPanel({ activeTool, openTools }: ToolPanelProps) {
  if (!activeTool || openTools.length === 0) {
    return null;
  }
  const CurrentTool = getToolComponent(activeTool);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="flex-1 min-h-0">
        <CurrentTool sessionId="local-session" toolId={activeTool} isActive={true} isSplitView={false} />
      </div>
    </div>
  );
}
