import type { ToolType } from "@/lib/tools.domain";
import { CodeTool } from "./code/CodeTool";
import type { ToolMetadata } from "./core/ToolTypes";
import { WhiteboardTool } from "./whiteboard/WhiteboardTool";

export const toolMetadata: Record<ToolType, ToolMetadata> = {
  code_editor: {
    type: "code_editor",
    title: "Code Editor",
    description: "Write and run code locally.",
    color: "text-emerald-400"
  },
  whiteboard: {
    type: "whiteboard",
    title: "Whiteboard",
    description: "Sketch and explain your approach.",
    color: "text-orange-400"
  }
};

export function getToolComponent(tool: ToolType) {
  if (tool === "code_editor") {
    return CodeTool;
  }
  return WhiteboardTool;
}
