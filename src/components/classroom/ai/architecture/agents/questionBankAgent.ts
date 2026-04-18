import type { AIInterviewStoreState } from "../store";
import type { InterviewProblem } from "../../types";
import { pickProblemByTopic } from "../../problems/dsaProblems";

export type QuestionIntent =
  | "ask_context"
  | "present_problem"
  | "ask_clarifying"
  | "ask_approach"
  | "ask_code"
  | "ask_test"
  | "ask_optimize"
  | "wrap_up";

export interface QuestionBankOutput {
  problem?: InterviewProblem;
  intent?: QuestionIntent;
  hint?: string;
}

/**
 * Deterministic signal provider (NOT a conversational agent).
 * - chooses a problem once a topic exists
 * - provides a small phase-intent + hint for the orchestrator to use
 */
export function questionBankAgent(opts: {
  main: AIInterviewStoreState["main"];
  secondary: AIInterviewStoreState["secondary"];
}): QuestionBankOutput {
  const { main, secondary } = opts;

  const problem = main.problem ?? pickProblemByTopic(main.selectedTopic);

  switch (main.phase) {
    case "intro":
    case "context":
      return {
        problem,
        intent: "ask_context",
        hint: "Ask the candidate which topic they want (arrays/strings/graphs/dp) and desired difficulty (easy/medium)."
      };
    case "problem":
      return {
        problem,
        intent: "present_problem",
        hint: "Present the problem, confirm understanding, and ask for clarifying questions."
      };
    case "clarifications":
      return {
        problem,
        intent: "ask_clarifying",
        hint: "Encourage clarifying questions about constraints and edge cases."
      };
    case "approach":
      return {
        problem,
        intent: "ask_approach",
        hint: "Ask for the high-level approach and complexity before coding."
      };
    case "coding":
      return {
        problem,
        intent: "ask_code",
        hint: `Ask them to implement ${problem?.evaluation.functionName ?? "the function"} and narrate as they code.`
      };
    case "testing":
      return {
        problem,
        intent: "ask_test",
        hint: "Ask for test plan and edge cases; prompt to run tests."
      };
    case "optimization":
      return {
        problem,
        intent: "ask_optimize",
        hint:
          secondary.difficulty === "medium"
            ? "Ask about optimization and discuss tradeoffs."
            : "Ask if they can simplify or improve readability and handle edge cases."
      };
    case "wrapup":
      return { problem, intent: "wrap_up", hint: "Wrap up with a short summary and invite questions." };
    case "ended":
    default:
      return { problem };
  }
}
