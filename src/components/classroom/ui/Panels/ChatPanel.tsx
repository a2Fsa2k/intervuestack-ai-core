import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export function ChatPanel({ messages, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="h-10 px-3 border-b border-[#1a1a1a] flex items-center gap-2 bg-[#0a0a0a]">
        <MessageCircle className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-300">Chat</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col gap-1", msg.sender === "You" ? "items-end" : "items-start")}>
              <span className="text-[10px] text-gray-500 px-1">{msg.sender}</span>
              <div className={cn("px-3 py-2 text-sm max-w-[85%] border", msg.sender === "You" ? "bg-[#1a1a1a] border-[#2a2a2a] text-gray-200" : "bg-[#0a0a0a] border-[#1a1a1a] text-gray-300")}>{msg.message}</div>
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const next = input.trim();
          if (!next) return;
          onSendMessage(next);
          setInput("");
        }}
        className="p-2 border-t border-[#1a1a1a] bg-[#0a0a0a]"
      >
        <div className="flex items-center gap-2 border border-[#1a1a1a] bg-[#0a0a0a]">
          <input value={input} onChange={(e) => setInput(e.target.value)} type="text" placeholder="Type a message..." className="flex-1 bg-transparent text-sm text-gray-300 placeholder:text-gray-600 outline-none px-3 py-2" />
          <button type="submit" className="px-3 py-2 border-l border-[#1a1a1a] text-gray-400 hover:text-gray-300 hover:bg-[#1a1a1a] transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
