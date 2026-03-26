import { useEffect, useState } from "react";
import { useClassroomContext } from "../runtime/ClassroomContext";
import { ControlsBar } from "./ControlsBar";
import { ToolPanel } from "./Panels/ToolPanel";
import { VideoPanel } from "./Panels/VideoPanel";

interface LayoutProps {
  onLeave: () => void;
}

export function Layout({ onLeave }: LayoutProps) {
  const { state } = useClassroomContext();
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="h-12 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm text-gray-400">Session Active</span>
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="IntervueStack logo" className="w-5 h-5" />
            <span className="text-sm font-semibold text-gray-300">IntervueStack</span>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-mono">{currentTime}</span>
      </div>

      <div className="h-[calc(100vh-3rem)] flex relative overflow-hidden">
        <div className="bg-[#0a0a0a] flex flex-col flex-1 border-r border-[#1a1a1a]">
          <ToolPanel activeTool={state.activeTool} openTools={state.openTools} />
        </div>

        <div className="bg-[#0a0a0a] flex flex-col flex-shrink-0 w-80 min-w-80 max-w-80">
          <div className="h-56 border-b border-[#1a1a1a] flex-shrink-0">
            <VideoPanel label="AI Interviewer" isPresent={true} isMainView={false} />
          </div>

          <div className="flex-1 min-h-0 border-b border-[#1a1a1a] bg-[#0a0a0a] p-3">
            <div className="h-full border border-[#1a1a1a] bg-[#070707] p-3 flex flex-col">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                Transcript
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto text-sm text-gray-500">
                <p className="mb-2">AI and user transcript will appear here.</p>
                <p className="text-xs text-gray-600">
                  Reserved for future integration.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1a1a1a] flex-shrink-0">
            <ControlsBar onLeave={onLeave} />
          </div>
        </div>
      </div>
    </div>
  );
}
