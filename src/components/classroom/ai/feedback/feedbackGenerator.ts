import type { InterviewState, TranscriptTurn, CodeEvalResult, InterviewRubric } from "../types";
import { generateOpenAIJSON } from "../openaiClient";

export interface StructuredFeedback {
  rubric: InterviewRubric;
  summary: string;
}

function isStructuredFeedback(v: unknown): v is StructuredFeedback {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, any>;
  const r = o.rubric;
  return (
    typeof o.summary === "string" &&
    r &&
    typeof r.problemUnderstanding === "number" &&
    typeof r.approachQuality === "number" &&
    typeof r.codeCorrectness === "number" &&
    typeof r.communication === "number" &&
    Array.isArray(r.notes)
  );
}

export async function generateStructuredFeedback(opts: {
  interview: InterviewState;
  transcript: TranscriptTurn[];
  userCode: string;
  lastCodeEval?: CodeEvalResult | null;
}): Promise<StructuredFeedback> {
  const { interview, transcript, userCode, lastCodeEval } = opts;
  const problem = interview.problem;
  const recentTranscript = transcript.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join("\n");

  const user = [
    "You are an expert DSA interviewer. The interview session has ended.",
    `Problem: ${problem?.title ?? "(none)"}`,
    `Prompt: ${problem?.prompt ?? "(none)"}`,
    `Transcript:\n${recentTranscript}`,
    `User's final code:\n${userCode}`,
    `Code evaluation result:\n${lastCodeEval ? JSON.stringify(lastCodeEval) : "none"}`,
    "Please provide structured feedback in this JSON format:",
    `{
      rubric: {
        problemUnderstanding: 1-5,
        approachQuality: 1-5,
        codeCorrectness: 1-5,
        communication: 1-5,
        notes: string[]
      },
      summary: string
    }`,
    "Return ONLY valid JSON."
  ].join("\n\n");

  return generateOpenAIJSON<StructuredFeedback>({
    system: "You are an expert DSA interviewer. Provide structured, fair, and actionable feedback.",
    user,
    model: "gpt-4o-mini",
    temperature: 0.2,
    validate: isStructuredFeedback,
    fallback: {
      rubric: {
        problemUnderstanding: 2,
        approachQuality: 2,
        codeCorrectness: lastCodeEval?.passed ? 4 : 2,
        communication: 2,
        notes: ["Feedback generation fallback used due to invalid model output."]
      },
      summary: "Thanks for interviewing. Review your approach, edge cases, and test coverage before the next attempt."
    }
  });
}
