import { Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPanelProps {
  label: string;
  isPresent: boolean;
  isMainView?: boolean;
}

export function VideoPanel({ label, isPresent, isMainView = false }: VideoPanelProps) {
  return (
    <div className="relative overflow-hidden bg-black border border-[#1a1a1a] h-full">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center rounded-full border border-[#2a2a2a] bg-[#0a0a0a] text-gray-500",
            isMainView ? "w-20 h-20" : "w-14 h-14"
          )}
        >
          {isPresent ? <User className={cn(isMainView ? "w-10 h-10" : "w-7 h-7")} /> : <Clock className={cn("animate-pulse", isMainView ? "w-10 h-10" : "w-7 h-7")} />}
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm text-gray-400 font-medium">{isPresent ? "Connected" : "Waiting to join"}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </div>
      <div className="absolute top-2 left-2">
        <div className={cn("w-2 h-2 rounded-full", isPresent ? "bg-green-500 animate-pulse" : "bg-gray-500")} />
      </div>
    </div>
  );
}
