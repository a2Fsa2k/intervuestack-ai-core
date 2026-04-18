import type { CodeEvalResult, InterviewState, OrchestratorAction, TranscriptTurn } from "./types";
import { generateGeminiJSON } from "./geminiClient";

/**
 * DEPRECATED: legacy single-file orchestrator.
 *
 * This file is kept temporarily for compatibility with older imports
 * and for preserving helpful types/helpers.
 *
 * Production brain lives in `ai/architecture/orchestratorAgent.ts`.
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
  // We intentionally do not provide a working implementation here to avoid
  // duplicate orchestration paths in production.
  // Any remaining callers should be migrated to `architecture/orchestratorAgent.ts`.
  const llmAction = await generateGeminiJSON<OrchestratorAction>({
    system: systemPrompt(),
    user: "Migration required: call architecture/orchestratorAgent.ts instead of legacy nextAction()."
  });

  return {
    interview: _opts.interview,
    action: {
      type: llmAction?.type ?? "END_SESSION",
      message:
        llmAction?.message ??
        "This project has migrated orchestrator logic. Please use the new architecture orchestrator.",
      phase: "ended"
    }
  };
}
