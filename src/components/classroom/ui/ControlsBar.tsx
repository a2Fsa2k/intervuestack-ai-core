import { PhoneOff } from "lucide-react";

interface ControlsBarProps {
  onLeave: () => void;
}

export function ControlsBar({ onLeave }: ControlsBarProps) {
  return (
    <div className="h-14 bg-[#0a0a0a] flex items-center justify-center gap-2 px-3">
      <button
        type="button"
        onClick={onLeave}
        className="px-4 h-10 flex items-center justify-center border bg-[#1a1a1a] border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
      >
        <PhoneOff size={16} />
      </button>
    </div>
  );
}
