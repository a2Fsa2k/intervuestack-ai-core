import { useMemo, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TranscriptTurn } from "./types";
import { createAudioRecorder } from "./stt/recorder";
import { transcribeWithOpenAI } from "./stt/openaiStt";

interface TranscriptPanelProps {
  transcript: TranscriptTurn[];
  isThinking: boolean;
  onSend: (text: string) => void;
}

export function TranscriptPanel({ transcript, isThinking, onSend }: TranscriptPanelProps) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interim, setInterim] = useState("");

  const recorderRef = useRef<Awaited<ReturnType<typeof createAudioRecorder>> | null>(null);

  const supported = useMemo(() => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia, []);

  const startVoice = async () => {
    if (isThinking) return;
    setVoiceError(null);
    setInterim("Recording…");
    try {
      const rec = await createAudioRecorder();
      recorderRef.current = rec;
      await rec.start();
      setListening(true);
    } catch (e) {
      setListening(false);
      setInterim("");
      setVoiceError(e instanceof Error ? e.message : String(e));
    }
  };

  const stopVoice = async () => {
    try {
      const rec = recorderRef.current;
      if (!rec) return;
      setInterim("Transcribing…");
      const audio = await rec.stop();
      setListening(false);
      recorderRef.current = null;

      const text = await transcribeWithOpenAI(audio);
      setInterim("");
      onSend(text);
    } catch (e) {
      setListening(false);
      setInterim("");
      setVoiceError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="h-full border border-[#1a1a1a] bg-[#070707] p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wide text-gray-500">Transcript</div>
        <div className="flex items-center gap-2">
          {isThinking && <div className="text-[11px] text-emerald-400">AI thinking…</div>}

          {listening ? (
            <button
              type="button"
              onClick={stopVoice}
              className="px-2 py-1 border text-xs flex items-center gap-1.5 border-emerald-700 text-emerald-300 hover:bg-[#0f0f0f]"
              title="Stop recording"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              disabled={!supported || isThinking}
              onClick={startVoice}
              className={cn(
                "px-2 py-1 border text-xs flex items-center gap-1.5",
                (!supported || isThinking)
                  ? "border-[#1a1a1a] text-gray-600 cursor-not-allowed"
                  : "border-[#2a2a2a] text-gray-300 hover:bg-[#0f0f0f]"
              )}
              title={supported ? "Record voice" : "Audio recording not supported"}
            >
              <Mic className="w-3.5 h-3.5" />
              Voice
            </button>
          )}

          <div className={cn("text-[11px]", listening ? "text-emerald-400" : "text-gray-600")}>{interim}</div>
        </div>
      </div>

      {voiceError && <div className="text-[11px] text-red-400 mb-2 break-words">{voiceError}</div>}

      <div className="flex-1 min-h-0 overflow-y-auto text-sm space-y-2 pr-1">
        {transcript.length === 0 ? (
          <p className="text-gray-600">Session conversation will appear here…</p>
        ) : (
          transcript.map((t) => (
            <div key={t.id} className={cn("flex flex-col gap-0.5", t.role === "user" ? "items-end" : "items-start")}>
              <div className="text-[10px] text-gray-500">
                {t.role === "user" ? "You" : t.role === "ai" ? "AI" : "System"} · {new Date(t.timestamp).toLocaleTimeString()}
              </div>
              <div
                className={cn(
                  "px-3 py-2 text-sm max-w-[95%] border whitespace-pre-wrap break-words",
                  t.role === "user"
                    ? "bg-[#1a1a1a] border-[#2a2a2a] text-gray-200"
                    : "bg-[#0a0a0a] border-[#1a1a1a] text-gray-300"
                )}
              >
                {t.text}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const next = input.trim();
          if (!next || isThinking) return;
          onSend(next);
          setInput("");
        }}
        className="mt-3"
      >
        <div className="flex items-center gap-2 border border-[#1a1a1a] bg-[#0a0a0a]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            type="text"
            placeholder={isThinking ? "AI is thinking…" : "Type (or use voice), then send"}
            className="flex-1 bg-transparent text-sm text-gray-300 placeholder:text-gray-600 outline-none px-3 py-2"
          />
          <button
            type="submit"
            disabled={isThinking}
            className="px-3 py-2 border-l border-[#1a1a1a] text-gray-400 hover:text-gray-300 hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
