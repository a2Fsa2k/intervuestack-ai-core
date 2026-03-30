import type { InterviewState, TranscriptTurn, CodeEvalResult, InterviewRubric } from "../types";
import { generateGeminiJSON } from "../geminiClient";

export interface StructuredFeedback {
  rubric: InterviewRubric;
  summary: string;
}

export async function generateStructuredFeedback(opts: {
  interview: InterviewState;
  transcript: TranscriptTurn[];
  userCode: string;
  lastCodeEval?: CodeEvalResult | null;
}): Promise<StructuredFeedback> {
  const { interview, transcript, userCode, lastCodeEval } = opts;
  const problem = interview.problem;
  const recentTranscript = transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join("\n");

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
        problemUnderstanding: 1-5, // How well did the candidate understand the problem?
        approachQuality: 1-5, // How strong was their approach/algorithm?
        codeCorrectness: 1-5, // How correct and robust was their code?
        communication: 1-5, // How clear and effective was their communication?
        notes: string[] // Key points, strengths, and areas for improvement
      },
      summary: string // A concise summary (2-5 sentences) for the candidate
    }`,
    "Return ONLY valid JSON."
  ].join("\n\n");

  return await generateGeminiJSON<StructuredFeedback>({
    system: "You are an expert DSA interviewer. Provide structured, fair, and actionable feedback.",
    user
  });
}
