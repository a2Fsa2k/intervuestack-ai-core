import { PhoneOff } from "lucide-react";

import { useInterviewController } from "../ai/useInterviewController";

interface ControlsBarProps {
  onLeave: () => void;
}

export function ControlsBar({ onLeave }: ControlsBarProps) {
  const { interview, feedback, isThinking } = useInterviewController();
  return (
    <div className="h-14 bg-[#0a0a0a] flex items-center justify-center gap-2 px-3">
      <button
        type="button"
        onClick={async () => {
          if (!feedback && interview.phase !== "ended" && !isThinking) {
            const evt = new CustomEvent("intervue:endSession");
            window.dispatchEvent(evt);
            await new Promise((res) => setTimeout(res, 1200));
          }
          onLeave();
        }}
        className="px-4 h-10 flex items-center justify-center border bg-[#1a1a1a] border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
      >
        <PhoneOff size={16} />
      </button>
    </div>
  );
}
