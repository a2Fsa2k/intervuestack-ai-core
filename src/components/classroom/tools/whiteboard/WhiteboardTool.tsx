import "tldraw/tldraw.css";
import { Suspense, lazy } from "react";
import type { ToolComponentProps } from "../core/ToolTypes";

const LazyTldraw = lazy(async () => {
  const module = await import("tldraw");
  return { default: module.Tldraw };
});

export function WhiteboardTool({ isActive }: ToolComponentProps) {
  return (
    <div className={isActive ? "h-full w-full bg-white" : "hidden"}>
      <Suspense
        fallback={
          <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a]">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 mx-auto border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading whiteboard...</p>
            </div>
          </div>
        }
      >
        <LazyTldraw autoFocus={false} hideUi={false} inferDarkMode={false} />
      </Suspense>
    </div>
  );
}
