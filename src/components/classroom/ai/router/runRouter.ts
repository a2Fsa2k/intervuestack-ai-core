import type { StoreAction } from "../architecture/store";
import type { InputBundle, RouterResult, RouterLLMOutput } from "./types";
import type { InterviewProblem } from "../types";
import { ROUTER_STATES, type RouterStateId } from "./stateMachine";
import { classify } from "./classifier";
import { selectAgents } from "./agentSelector";
import { buildPromptSlots } from "./promptBuilder";
import { parseRouterOutput, validateRouterOutput } from "./parser";
import { applyTransition } from "./transition";

import { personaAgent } from "../architecture/agents/personaAgent";
import { questionBankAgent } from "../architecture/agents/questionBankAgent";
import { evaluatorAgent } from "../architecture/agents/evaluatorAgent";
import { timeManager } from "../architecture/agents/timeManager";

import { generateOpenAIJSON } from "../openaiClient";

const LLM_FALLBACK: RouterLLMOutput = {
  message: "Let's continue. Walk me through your thinking.",
  store_updates: []
};

const COMMENT_SYMBOL: Record<string, string> = {
  javascript: "//",
  python: "#",
  java: "//",
  cpp: "//",
  c: "//"
};

function generateStarterCode(problem: InterviewProblem, language: string): string {
  const comment = COMMENT_SYMBOL[language] ?? "//";
  const lines: string[] = [
    `${comment} Problem: ${problem.title}`,
    `${comment} ${problem.prompt}`,
    ""
  ];
  for (const ex of problem.examples) {
    lines.push(`${comment} Example: ${ex.input} -> ${ex.output}`);
    if (ex.explanation) lines.push(`${comment} ${ex.explanation}`);
  }
  lines.push("", problem.starterCode);
  return lines.join("\n");
}

async function runAgents(opts: {
  agents: string[];
  bundle: InputBundle;
}): Promise<Record<string, unknown>> {
  const { agents, bundle } = opts;
  const out: Record<string, unknown> = {};

  // Strict: run only the selected agents, nothing else.
  for (const a of agents) {
    switch (a) {
      case "persona": {
        const p = await personaAgent({
          selectedTopic: bundle.store.main.selectedTopic,
          difficulty: bundle.store.secondary.difficulty
        });
        out.persona = { tone: p.tone, style: p.interviewerStyle, probing_style: p.probingStyle };
        break;
      }
      case "question_bank": {
        const qb = questionBankAgent({ main: bundle.store.main, secondary: bundle.store.secondary });
        out.question_bank = { problem: qb.problem, intent: qb.intent, hint: qb.hint };
        break;
      }
      case "evaluator": {
        const tail = bundle.transcriptTail
          .slice(-6)
          .map((t) => `${t.role}: ${t.text}`)
          .join("\n");
        const ev = await evaluatorAgent({
          main: bundle.store.main,
          secondary: bundle.store.secondary,
          userInput: bundle.userInput ?? "",
          userCode: bundle.userCode ?? "",
          recentTranscriptText: tail
        });
        out.evaluator = ev;
        break;
      }
      case "time_manager": {
        out.time_manager = timeManager({
          secondary: bundle.store.secondary,
          startedAt: bundle.store.main.lastUserInputAt ?? Date.now(),
          now: Date.now()
        });
        break;
      }
      case "code_monitor": {
        // Deterministic monitor is handled upstream in controller currently.
        out.code_monitor = { note: "handled upstream" };
        break;
      }
      case "hint": {
        // Placeholder: hint strategy is prompt-level for now.
        out.hint = { hint: bundle.store.main.problem ? "Consider the core invariant and edge cases." : "" };
        break;
      }
      default:
        break;
    }
  }

  return out;
}

export async function runRouterStep(bundle: InputBundle): Promise<RouterResult> {
  const classifiedStateId = classify(bundle) as RouterStateId;
  const state = ROUTER_STATES[classifiedStateId] ?? ROUTER_STATES.greeting_init;

  // Hard rule: during coding, DO NOT CALL LLM.
  if (state.id === "coding") {
    return { aiMessage: "", dispatches: [], nextStateId: "coding" };
  }

  const agents = selectAgents(state.id);
  const agentOutputs = await runAgents({ agents, bundle: { ...bundle, currentStateId: classifiedStateId } });

  // Deterministic problem dispatch: LLM can't reliably include complex problem objects in store_updates.
  const extraDispatches: StoreAction[] = [];
  const qbProblem = (agentOutputs.question_bank as any)?.problem;
  const problemJustSelected = !bundle.store.main.problem && qbProblem;
  if (problemJustSelected) {
    extraDispatches.push({ type: "MAIN/SET_PROBLEM", problem: qbProblem });
  }

  // When first entering problem_introduced, write starter code with problem as comments.
  let codeUpdate: string | undefined;
  if (classifiedStateId === "problem_introduced" && problemJustSelected && qbProblem) {
    codeUpdate = generateStarterCode(qbProblem, bundle.store.main.preferredLanguage);
  }

  const prompt = buildPromptSlots({
    state,
    store: bundle.store,
    transcriptTail: bundle.transcriptTail,
    userCode: bundle.userCode,
    agentOutputs
  });

  const llm = await generateOpenAIJSON<RouterLLMOutput>({
    system: prompt.system,
    user: prompt.user,
    model: "gpt-4o-mini",
    temperature: 0.35,
    validate: (v: unknown): v is RouterLLMOutput => validateRouterOutput(v),
    fallback: LLM_FALLBACK
  });

  const parsed = parseRouterOutput(JSON.stringify(llm), LLM_FALLBACK);

  const transitioned = applyTransition({ bundle: { ...bundle, currentStateId: classifiedStateId }, llm: parsed });

  return {
    aiMessage: parsed.message ?? LLM_FALLBACK.message,
    dispatches: [...extraDispatches, ...transitioned.dispatches],
    nextStateId: transitioned.nextStateId,
    codeUpdate
  };
}
