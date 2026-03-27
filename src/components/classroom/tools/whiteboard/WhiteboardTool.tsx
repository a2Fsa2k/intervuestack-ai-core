import "tldraw/tldraw.css";
import { Tldraw } from "tldraw";
import type { ToolComponentProps } from "../core/ToolTypes";

export function WhiteboardTool({ isActive }: ToolComponentProps) {
  return (
    <div className={isActive ? "h-full w-full bg-white" : "hidden"}>
      <Tldraw autoFocus={false} hideUi={false} inferDarkMode={false} />
    </div>
  );
}
