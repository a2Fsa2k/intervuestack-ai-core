import type {
  CodeEvalResult,
  InterviewState,
  OrchestratorAction,
  TranscriptTurn
} from "./types";
import { pickProblemByTopic } from "./problems/dsaProblems";
import { generateGeminiJSON } from "./geminiClient";

function lastTurns(transcript: TranscriptTurn[], n: number) {
  return transcript.slice(Math.max(0, transcript.length - n));
}

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

export function systemPrompt() {
  return `You are an AI DSA interviewer inside an interview classroom.

Rules:
- Behave like a real interviewer: ask guiding questions, do not provide final corrected code.
- Drive the interview forward; if candidate is stuck, give incremental hints.
- If code is incorrect, ask targeted questions based on failing tests or suspicious logic.
- Keep outputs concise (2-6 short paragraphs max).

You MUST return a single JSON object with this TypeScript shape:
{
  type: 'ASK_CONTEXT'|'PRESENT_PROBLEM'|'ASK_CLARIFYING'|'ASK_APPROACH'|'ASK_TO_CODE'|'ASK_TO_TEST'|'ASK_TO_OPTIMIZE'|'GIVE_HINT'|'ASK_TARGETED_CODE_QUESTION'|'WRAP_UP'|'END_SESSION',
  message: string,
  phase?: 'intro'|'context'|'problem'|'clarifications'|'approach'|'coding'|'testing'|'optimization'|'wrapup'|'ended',
  shouldRunCodeEval?: boolean,
  debug?: object
}
If the user says '[END_INTERVIEW]' or requests to end, return type: 'END_SESSION' and a short wrap-up message.
Return ONLY JSON.`;
}

export async function nextAction(opts: {
  interview: InterviewState;
  transcript: TranscriptTurn[];
  userCode: string;
  lastCodeEval?: CodeEvalResult | null;
}): Promise<{ interview: InterviewState; action: OrchestratorAction; maybeProblemStarterCode?: string }> {
  let interview = { ...opts.interview, updatedAt: Date.now() };

  // Ensure a problem exists after context.
  if (!interview.problem && (interview.phase === "problem" || interview.phase === "clarifications" || interview.phase === "approach" || interview.phase === "coding" || interview.phase === "testing" || interview.phase === "optimization" || interview.phase === "wrapup")) {
    interview.problem = pickProblemByTopic(interview.selectedTopic);
  }

  // First AI turn.
  if (opts.transcript.length === 0) {
    const action: OrchestratorAction = {
      type: "ASK_CONTEXT",
      phase: "context",
      message:
        "Hi! I’ll be your interviewer today. Before we start—what topics are you most comfortable with (arrays/strings, graphs, DP), and what’s your preferred difficulty (easy/medium)?"
    };
    return { interview: { ...interview, phase: "context" }, action };
  }

  const problem = interview.problem ?? pickProblemByTopic(interview.selectedTopic);

  // Lightweight rolling summary update (heuristic; can be replaced by LLM summarizer later)
  const recent = lastTurns(opts.transcript, 8)
    .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n");

  const user = `Current phase: ${interview.phase}
Selected topic: ${interview.selectedTopic ?? "(unknown)"}
Problem (if set): ${problem.title}

Problem prompt:\n${problem.prompt}

Recent transcript (last turns):\n${recent}

User code snapshot:\n${opts.userCode}

Last code evaluation:\n${opts.lastCodeEval ? JSON.stringify(opts.lastCodeEval) : "none"}

Decide the next best interviewer action.`;

  const llmAction = await generateGeminiJSON<OrchestratorAction>({
    system: systemPrompt(),
    user
  });

  // Normalize/problem injection.
  if (llmAction.type === "PRESENT_PROBLEM") {
    interview = { ...interview, problem, phase: "problem" };

    const msg = llmAction.message ?? "";
    const alreadyHasTitle = msg.toLowerCase().includes(problem.title.toLowerCase());
    // Check for the *full* prompt, not just a snippet
    const alreadyHasFullPrompt = msg.replace(/\s+/g, " ").includes(problem.prompt.replace(/\s+/g, " "));

    const suffix = `\n\nProblem: ${problem.title} (${problem.difficulty})\n\n${problem.prompt}`;

    return {
      interview,
      action: {
        ...llmAction,
        phase: "problem",
        message: alreadyHasTitle && alreadyHasFullPrompt ? msg : msg + suffix
      },
      maybeProblemStarterCode: problem.starterCode
    };
  }

  const nextPhase = llmAction.phase ?? interview.phase;
  interview = { ...interview, problem, phase: nextPhase };

  return { interview, action: llmAction };
}
