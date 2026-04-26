import type { CodeEvalResult, InterviewState, OrchestratorAction, TranscriptTurn } from "./types";

/**
 * DEPRECATED: legacy single-file orchestrator.
 *
 * Kept only for helper exports.
 * Do not use `nextAction()` in production; the brain lives in `ai/architecture/orchestratorAgent.ts`.
 */

export function createInitialInterviewState(): InterviewState {
  const now = Date.now();
  return {
    phase: "intro",
    preferredLanguage: "javascript",
    createdAt: now,
    updatedAt: now,
    rollingSummary: ""
  };
}

// Keep prompt helper in case other modules depend on it.
export function systemPrompt() {
  return `DEPRECATED: This prompt is no longer used for control flow.
The production orchestrator is in ai/architecture/orchestratorAgent.ts.`;
}

// Deprecated wrapper: keep signature but forward to the new orchestrator pattern if needed.
export async function nextAction(_opts: {
  interview: InterviewState;
  transcript: TranscriptTurn[];
  userCode: string;
  lastCodeEval?: CodeEvalResult | null;
}): Promise<{ interview: InterviewState; action: OrchestratorAction; maybeProblemStarterCode?: string }> {
  return {
    interview: _opts.interview,
    action: {
      type: "END_SESSION",
      message:
        "This project has migrated orchestrator logic. Please use `architecture/orchestratorAgent.ts` (OpenAI-based).",
      phase: "ended"
    }
  };
}
