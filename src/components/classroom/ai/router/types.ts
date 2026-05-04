import type { AIInterviewStoreState, StoreAction } from "../architecture/store";
import type { TranscriptTurn } from "../types";
import type { RouterStateId } from "./stateMachine";

export type SignalType = "event" | "timer" | "monitor";

export interface InputBundle {
  userInput?: string;
  userCode?: string;
  signalType: SignalType;
  currentStateId: string;
  store: AIInterviewStoreState;
  elapsedMs: number;
  idleMs: number;
  transcriptTail: TranscriptTurn[];
}

export interface RouterLLMOutput {
  message: string;
  store_updates?: StoreAction[] | unknown;
}

export interface RouterResult {
  aiMessage: string;
  dispatches: StoreAction[];
  nextStateId: RouterStateId;
}
