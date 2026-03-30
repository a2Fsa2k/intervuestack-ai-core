export type TranscriptRole = "ai" | "user" | "system";

export interface TranscriptTurn {
  id: string;
  role: TranscriptRole;
  text: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export type InterviewPhase =
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

export interface InterviewRubric {
  problemUnderstanding: number; // 1-5
  approachQuality: number; // 1-5
  codeCorrectness: number; // 1-5
  communication: number; // 1-5
  notes: string[];
}

export interface InterviewProblem {
  id: string;
  title: string;
  difficulty: "easy" | "medium";
  topicTags: string[];
  prompt: string;
  constraints?: string[];
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: string;
  evaluation: {
    functionName: string;
    tests: Array<{ name: string; input: unknown[]; expected: unknown }>;
  };
}

export interface InterviewState {
  phase: InterviewPhase;
  selectedTopic?: string;
  preferredLanguage: "javascript"; // keep scope tight
  problem?: InterviewProblem;
  createdAt: number;
  updatedAt: number;
  rollingSummary: string;
  feedback?: import("./feedback/feedbackGenerator").StructuredFeedback;
}

export type OrchestratorActionType =
  | "ASK_CONTEXT"
  | "PRESENT_PROBLEM"
  | "ASK_CLARIFYING"
  | "ASK_APPROACH"
  | "ASK_TO_CODE"
  | "ASK_TO_TEST"
  | "ASK_TO_OPTIMIZE"
  | "GIVE_HINT"
  | "ASK_TARGETED_CODE_QUESTION"
  | "WRAP_UP"
  | "END_SESSION";

export interface OrchestratorAction {
  type: OrchestratorActionType;
  message: string;
  phase?: InterviewPhase;
  shouldRunCodeEval?: boolean;
  debug?: Record<string, unknown>;
}

export interface CodeEvalResult {
  passed: boolean;
  passedCount: number;
  totalCount: number;
  failures: Array<{ name: string; expected: unknown; received: unknown; error?: string }>;
}
