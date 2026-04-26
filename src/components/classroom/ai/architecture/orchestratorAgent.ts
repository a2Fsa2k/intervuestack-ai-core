import type { TranscriptTurn } from "../types";
import type { AIInterviewStoreState, StoreAction, TimingSignal } from "./store";
import { questionBankAgent } from "./agents/questionBankAgent";
import { evaluatorAgent } from "./agents/evaluatorAgent";
import { personaAgent } from "./agents/personaAgent";
import { timeManager } from "./agents/timeManager";
import { generateOpenAIJSON } from "../openaiClient";

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

function parseCodeMonitorSignals(userInput?: string): string[] {
  if (!userInput) return [];
  const m = userInput.match(/^\[CODE_MONITOR\]\s*(.*)$/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isTimerMilestone(userInput?: string): boolean {
  return Boolean(userInput && userInput.startsWith("[TIMER_"));
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

  const codeSignals = parseCodeMonitorSignals(userInput);

  // Always keep snapshots fresh for event; avoid constantly updating code snapshots on timer.
  if (typeof userInput === "string" && userInput.trim() && reason === "event") {
    dispatches.push({ type: "MAIN/SET_LAST_USER_INPUT", text: userInput, at: now });
  }

  // Only store code snapshot when it changed meaningfully (simple heuristic)
  if (reason === "event") {
    dispatches.push({ type: "MAIN/SET_CODE_SNAPSHOT", code: userCode, at: now });
  }

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
  const rollingSummary = store.main.rollingSummary || "";

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

  // Only run code eval on user events in coding-like phases.
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

  // Provide candidate-specific, non-spammy intervention hints to the LLM.
  const interventionHints: string[] = [];
  if (reason === "timer" && codeSignals.length) {
    if (codeSignals.includes("stuck_no_progress")) {
      interventionHints.push("Candidate seems stuck. Ask them to narrate their current approach and next step.");
    }
    if (codeSignals.includes("likely_bruteforce")) {
      interventionHints.push("Candidate likely heading toward brute force. Ask about time complexity and better approach.");
    }
    if (codeSignals.includes("repeated_syntax_errors") || codeSignals.includes("syntax_error")) {
      interventionHints.push("Candidate hitting syntax errors. Ask to explain logic first; then fix syntax.");
    }
    if (codeSignals.includes("solution_progress")) {
      interventionHints.push("Candidate may have a working shape. Prompt them to test edge cases and run tests.");
    }
  }

  if (reason === "timer" && isTimerMilestone(userInput)) {
    interventionHints.push("This is a timer milestone. Keep the message short and practical.");
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
    "- Do not dump solutions.",
    "- Use rolling summary as primary context; use transcript tail for immediate phrasing.",
    "- If this is a timer intervention, avoid re-asking the same question verbatim.",
    "Return ONLY JSON: { message: string, nextPhase?: string, shouldEnd?: boolean }",
    "",
    `Current phase: ${store.main.phase}`,
    `Reason: ${reason}`,
    `Intent: ${qb.intent ?? "(none)"}`,
    `Hint: ${qb.hint ?? "(none)"}`,
    `Problem: ${qb.problem?.title ?? store.main.problem?.title ?? "(none)"}`,
    "Persona style (structured):",
    JSON.stringify(persona),
    "Evaluator insights (structured):",
    JSON.stringify(evalOut),
    "Timing signals:",
    JSON.stringify(timingSignals),
    "Autonomy / code monitor signals:",
    codeSignals.length ? codeSignals.join(", ") : "(none)",
    "Intervention hints:",
    interventionHints.length ? interventionHints.join(" | ") : "(none)",
    "Rolling summary:",
    rollingSummary || "(empty)",
    "Recent transcript tail:",
    recentTranscriptText || "(empty)",
    "User code snapshot (truncate if large):",
    userCode.length > 2000 ? userCode.slice(0, 2000) + "\n...<truncated>" : userCode
  ].join("\n");

  const llm = await generateOpenAIJSON<OrchestratorLLMResponse>({
    system: "You are a production-grade AI interviewer orchestrator.",
    user: llmUser,
    model: "gpt-4o-mini",
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
