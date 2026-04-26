import type { AIInterviewStoreState } from "../store";
import type { CodeEvalResult } from "../../types";
import { evaluateUserCodeJS } from "../../codeEval";
import { generateOpenAIJSON } from "../../openaiClient";

export type CorrectnessLabel = "correct" | "partial" | "wrong";

export interface EvaluatorOutput {
  scores: {
    problemUnderstanding: number;
    approachQuality: number;
    codeCorrectness: number;
    communication: number;
  };
  codeEval?: CodeEvalResult | null;
  insights: {
    correctness: CorrectnessLabel;
    issues: string[];
    focusAreas: string[];
  };
}

function isEvaluatorOutput(v: unknown): v is Omit<EvaluatorOutput, "codeEval"> {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, any>;
  const scores = o.scores;
  const insights = o.insights;
  return (
    scores &&
    typeof scores.problemUnderstanding === "number" &&
    typeof scores.approachQuality === "number" &&
    typeof scores.codeCorrectness === "number" &&
    typeof scores.communication === "number" &&
    insights &&
    (insights.correctness === "correct" || insights.correctness === "partial" || insights.correctness === "wrong") &&
    Array.isArray(insights.issues) &&
    Array.isArray(insights.focusAreas)
  );
}

function correctnessFromEval(codeEval?: CodeEvalResult | null): CorrectnessLabel {
  if (!codeEval) return "partial";
  if (codeEval.passed) return "correct";
  if (codeEval.passedCount === 0) return "wrong";
  return "partial";
}

export async function evaluatorAgent(opts: {
  main: AIInterviewStoreState["main"];
  secondary: AIInterviewStoreState["secondary"];
  userInput: string;
  userCode: string;
  recentTranscriptText: string;
  runCodeEval?: boolean;
}): Promise<EvaluatorOutput> {
  const { main, userInput, userCode, recentTranscriptText, runCodeEval } = opts;

  let codeEval: CodeEvalResult | null | undefined = opts.secondary.lastCodeEval;
  if (runCodeEval && main.problem) {
    codeEval = await evaluateUserCodeJS({ userCode, problem: main.problem });
  }

  const correctness = correctnessFromEval(codeEval);

  // Optional Gemini: produce structured *insights only*.
  const user = [
    "You are an evaluator. Do NOT write conversational feedback.",
    "Return ONLY JSON:",
    '{"scores":{"problemUnderstanding":1-5,"approachQuality":1-5,"codeCorrectness":1-5,"communication":1-5},"insights":{"correctness":"correct|partial|wrong","issues":string[],"focusAreas":string[]}}',
    `Phase: ${main.phase}`,
    `Problem: ${main.problem?.title ?? "(none)"}`,
    `Latest user input: ${userInput}`,
    `CodeEval: ${codeEval ? JSON.stringify(codeEval) : "none"}`,
    "Recent transcript:",
    recentTranscriptText || "(empty)",
    `Correctness label (heuristic): ${correctness}`
  ].join("\n");

  const llm = await generateOpenAIJSON<Omit<EvaluatorOutput, "codeEval">>({
    system: "Be strict; ground codeCorrectness in CodeEval. Keep issues/focusAreas short.",
    user,
    model: "gpt-4o-mini",
    temperature: 0.2,
    validate: isEvaluatorOutput,
    fallback: {
      scores: {
        problemUnderstanding: 3,
        approachQuality: 3,
        codeCorrectness: codeEval?.passed ? 5 : 2,
        communication: 3
      },
      insights: {
        correctness,
        issues: codeEval?.failures?.slice(0, 3).map((f) => `${f.name}: ${f.error ?? "wrong output"}`) ?? [],
        focusAreas: ["Explain the approach", "Handle edge cases", "Validate with tests"]
      }
    }
  });

  return { ...llm, codeEval };
}
