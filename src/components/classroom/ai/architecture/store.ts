import type { CodeEvalResult, InterviewProblem } from "../types";

export type TimingSignal =
  | { type: "TICK"; now: number; elapsedMs: number }
  | { type: "SOFT_WARNING"; message: string }
  | { type: "HARD_STOP"; reason: string };

export interface SharedStateMain {
  sessionId: string;
  phase:
    | "intro"
    | "context"
    | "problem"
    | "clarifications"
    | "approach"
    | "coding"
    | "testing"
    | "optimization"
    | "wrapup"
    | "ended";
  selectedTopic?: string;
  preferredLanguage: "javascript";
  problem?: InterviewProblem;
  rollingSummary: string;
  lastUserInput?: string;
  lastCodeSnapshot?: string;
  lastUserInputAt?: number;
  lastCodeChangeAt?: number;
}

export interface SharedStateSecondary {
  difficulty: "easy" | "medium";
  followupsAsked: number;
  lastCodeEval?: CodeEvalResult | null;
  lastTimingSignal?: TimingSignal;
  lastMonitorSignals?: string[];
  notes: string[];
}

export interface AIInterviewStoreState {
  main: SharedStateMain;
  secondary: SharedStateSecondary;
}

export type StoreAction =
  | { type: "MAIN/SET_PHASE"; phase: SharedStateMain["phase"] }
  | { type: "MAIN/SET_TOPIC"; topic?: string }
  | { type: "MAIN/SET_PROBLEM"; problem?: InterviewProblem }
  | { type: "MAIN/SET_LAST_USER_INPUT"; text: string; at: number }
  | { type: "MAIN/SET_CODE_SNAPSHOT"; code: string; at: number }
  | { type: "MAIN/SET_ROLLING_SUMMARY"; summary: string }
  | { type: "SECONDARY/SET_DIFFICULTY"; difficulty: "easy" | "medium" }
  | { type: "SECONDARY/INC_FOLLOWUPS" }
  | { type: "SECONDARY/SET_CODE_EVAL"; result: CodeEvalResult | null }
  | { type: "SECONDARY/SET_TIMING_SIGNAL"; signal: TimingSignal }
  | { type: "SECONDARY/SET_MONITOR_SIGNALS"; signals: string[] }
  | { type: "SECONDARY/ADD_NOTE"; note: string }
  | { type: "RESET"; state: AIInterviewStoreState };

export function createInitialStoreState(sessionId: string): AIInterviewStoreState {
  return {
    main: {
      sessionId,
      phase: "intro",
      preferredLanguage: "javascript",
      rollingSummary: "",
      lastUserInput: "",
      lastCodeSnapshot: "",
      lastUserInputAt: undefined,
      lastCodeChangeAt: undefined
    },
    secondary: {
      difficulty: "easy",
      followupsAsked: 0,
      lastCodeEval: null,
      lastTimingSignal: undefined,
      lastMonitorSignals: [],
      notes: []
    }
  };
}

export function aiInterviewStoreReducer(state: AIInterviewStoreState, action: StoreAction): AIInterviewStoreState {
  switch (action.type) {
    case "MAIN/SET_PHASE":
      return { ...state, main: { ...state.main, phase: action.phase } };
    case "MAIN/SET_TOPIC":
      return { ...state, main: { ...state.main, selectedTopic: action.topic } };
    case "MAIN/SET_PROBLEM":
      return { ...state, main: { ...state.main, problem: action.problem } };
    case "MAIN/SET_LAST_USER_INPUT":
      return {
        ...state,
        main: { ...state.main, lastUserInput: action.text, lastUserInputAt: action.at }
      };
    case "MAIN/SET_CODE_SNAPSHOT":
      return {
        ...state,
        main: { ...state.main, lastCodeSnapshot: action.code, lastCodeChangeAt: action.at }
      };
    case "MAIN/SET_ROLLING_SUMMARY":
      return { ...state, main: { ...state.main, rollingSummary: action.summary } };
    case "SECONDARY/SET_DIFFICULTY":
      return { ...state, secondary: { ...state.secondary, difficulty: action.difficulty } };
    case "SECONDARY/INC_FOLLOWUPS":
      return { ...state, secondary: { ...state.secondary, followupsAsked: state.secondary.followupsAsked + 1 } };
    case "SECONDARY/SET_CODE_EVAL":
      return { ...state, secondary: { ...state.secondary, lastCodeEval: action.result } };
    case "SECONDARY/SET_TIMING_SIGNAL":
      return { ...state, secondary: { ...state.secondary, lastTimingSignal: action.signal } };
    case "SECONDARY/SET_MONITOR_SIGNALS":
      return { ...state, secondary: { ...state.secondary, lastMonitorSignals: action.signals } };
    case "SECONDARY/ADD_NOTE":
      return { ...state, secondary: { ...state.secondary, notes: [...state.secondary.notes, action.note] } };
    case "RESET":
      return action.state;
    default:
      return state;
  }
}
