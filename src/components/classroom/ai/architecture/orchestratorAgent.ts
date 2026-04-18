import type { TranscriptTurn } from "../types";
import type { AIInterviewStoreState, StoreAction, TimingSignal } from "./store";
import { questionBankAgent } from "./agents/questionBankAgent";
import { evaluatorAgent } from "./agents/evaluatorAgent";
import { personaAgent } from "./agents/personaAgent";
import { timeManager } from "./agents/timeManager";
import { generateGeminiJSON } from "../geminiClient";

export interface OrchestratorAgentInput {
  store: AIInterviewStoreState;
  transcript: TranscriptTurn[];
  userInput?: string;
  userCode: string;
  startedAt: number;
  now: number;
  reason: "event" | "timer";
}

type NextPhase = AIInterviewStoreState["main"]["phase"];

export interface OrchestratorLLMResponse {
  message: string;
  nextPhase?: NextPhase;
  shouldEnd?: boolean;
}

function isOrchestratorLLMResponse(v: unknown): v is OrchestratorLLMResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.message === "string" && (o.nextPhase === undefined || typeof o.nextPhase === "string");
}

export interface OrchestratorAgentResult {
  dispatches: StoreAction[];
  aiMessage?: string;
  timingSignals?: TimingSignal[];
  shouldEnd?: boolean;
  shouldRunCodeEval?: boolean;
}

function transcriptTail(transcript: TranscriptTurn[], maxTurns = 10): string {
  return transcript
    .slice(-maxTurns)
    .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n");
}

function sanitizeNextPhase(current: NextPhase, requested?: NextPhase, hasProblem?: boolean): NextPhase {
  if (!requested) return current;

  // Enforce: don't enter coding/testing/optimization without a problem.
  if (!hasProblem && (requested === "coding" || requested === "testing" || requested === "optimization")) {
    return "problem";
  }

  return requested;
}

export async function orchestratorAgent(input: OrchestratorAgentInput): Promise<OrchestratorAgentResult> {
  const { store, transcript, userInput, userCode, startedAt, now, reason } = input;
  const dispatches: StoreAction[] = [];

  // Always keep snapshots fresh.
  if (typeof userInput === "string" && userInput.trim()) {
    dispatches.push({ type: "MAIN/SET_LAST_USER_INPUT", text: userInput, at: now });
  }
  dispatches.push({ type: "MAIN/SET_CODE_SNAPSHOT", code: userCode, at: now });

  // Deterministic time manager.
  const tm = timeManager({ secondary: store.secondary, startedAt, now });
  const timingSignals = tm.timingSignals;
  const hardStop = timingSignals.find((s) => s.type === "HARD_STOP");
  if (hardStop) {
    dispatches.push({ type: "SECONDARY/SET_TIMING_SIGNAL", signal: hardStop });
    return {
      dispatches,
      aiMessage: "Time is up — let's wrap up here.",
      timingSignals,
      shouldEnd: true
    };
  }

  const recentTranscriptText = transcriptTail(transcript);

  // Deterministic signals (no user-facing text here).
  const qb = questionBankAgent({ main: store.main, secondary: store.secondary });
  if (!store.main.problem && qb.problem) {
    dispatches.push({ type: "MAIN/SET_PROBLEM", problem: qb.problem });
  }

  // Persona style knobs (structured only). This is optional but allowed.
  const persona = await personaAgent({
    selectedTopic: store.main.selectedTopic,
    difficulty: store.secondary.difficulty
  });

  const shouldRunCodeEval =
    reason === "event" &&
    (store.main.phase === "coding" || store.main.phase === "testing" || store.main.phase === "optimization");

  const evalOut = await evaluatorAgent({
    main: store.main,
    secondary: store.secondary,
    userInput: userInput ?? "",
    userCode,
    recentTranscriptText,
    runCodeEval: shouldRunCodeEval
  });

  if (shouldRunCodeEval) {
    dispatches.push({ type: "SECONDARY/SET_CODE_EVAL", result: evalOut.codeEval ?? null });
  }

  // Single conversational generation: ONLY this LLM call produces user-facing text.
  const llmUser = [
    "You are the ONE interviewer brain. Produce the next interviewer message.",
    "Tone requirements:",
    "- Professional, concise, neutral-positive.",
    "- Mildly probing; keep moving forward.",
    "- Avoid excessive praise. Do not compliment every answer.",
    "- Use acknowledgements like: 'Okay.', 'Understood.', 'Makes sense.', 'Good.'",
    "Guidelines:",
    "- Be coherent in tone and flow.",
    "- Use intent/hint as guidance, but write naturally.",
    "- Do not dump solutions.",
    "- If code is failing, ask targeted questions based on evaluator insights.",
    "- If user wants to end or timing says stop, wrap up briefly.",
    "Return ONLY JSON: { message: string, nextPhase?: string, shouldEnd?: boolean }",
    "",
    `Current phase: ${store.main.phase}`,
    `Reason: ${reason}`,
    `Intent: ${qb.intent ?? "(none)"}`,
    `Hint: ${qb.hint ?? "(none)"}`,
    `Problem: ${qb.problem?.title ?? store.main.problem?.title ?? "(none)"}`,
    `Constraints: ${(qb.problem?.constraints ?? store.main.problem?.constraints ?? []).join(" | ") || "(none)"}`,
    "Persona style (structured):",
    JSON.stringify(persona),
    "Evaluator insights (structured):",
    JSON.stringify(evalOut),
    "Timing signals:",
    JSON.stringify(timingSignals),
    "Recent transcript:",
    recentTranscriptText || "(empty)",
    "User code snapshot:",
    userCode
  ].join("\n");

  const llm = await generateGeminiJSON<OrchestratorLLMResponse>({
    system: "You are a production-grade AI interviewer orchestrator.",
    user: llmUser,
    temperature: 0.35,
    validate: isOrchestratorLLMResponse,
    fallback: {
      message: "Let's continue. Walk me through your thinking.",
      shouldEnd: false
    }
  });

  const nextPhase = sanitizeNextPhase(store.main.phase, llm.nextPhase, Boolean(store.main.problem ?? qb.problem));
  if (nextPhase !== store.main.phase) {
    dispatches.push({ type: "MAIN/SET_PHASE", phase: nextPhase });
  }

  const soft = timingSignals.find((s) => s.type === "SOFT_WARNING");
  if (soft && reason === "timer") {
    dispatches.push({ type: "SECONDARY/SET_TIMING_SIGNAL", signal: soft });
  }

  return {
    dispatches,
    aiMessage: llm.message,
    timingSignals,
    shouldEnd: Boolean(llm.shouldEnd),
    shouldRunCodeEval
  };
}
