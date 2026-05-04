import type { TranscriptTurn } from "../types";
import type { AIInterviewStoreState } from "../architecture/store";
import type { RouterStateConfig } from "./stateMachine";

function truncateLines(code: string, maxLines: number): string {
  const lines = code.split("\n");
  if (lines.length <= maxLines) return code;
  return lines.slice(-maxLines).join("\n");
}

function formatTranscriptTail(tail: TranscriptTurn[]): string {
  return tail
    .slice(-6)
    .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n");
}

export function buildPromptSlots(opts: {
  state: RouterStateConfig;
  store: AIInterviewStoreState;
  transcriptTail: TranscriptTurn[];
  userCode?: string;
  agentOutputs: Record<string, unknown>;
}): { system: string; user: string } {
  const { state, store, transcriptTail, userCode, agentOutputs } = opts;

  const persona = agentOutputs.persona as any;
  const system_persona = persona
    ? `You are an AI interviewer. Tone: ${persona.tone}. Style: ${persona.style}. Probing style: ${persona.probing_style}.`
    : "You are an AI interviewer.";

  const state_context = `State: ${state.id}\nAI goal: ${state.ai_goal}`;

  const state_behavior_instruction =
    state.id === "coding_progressing"
      ? "Briefly acknowledge progress (max 1 sentence), then ask ONE light probing question about complexity or correctness."
      : state.id === "coding_check_in"
        ? "The candidate has been idle. Gently check in without pressure. Do not give hints yet."
        : state.id === "stuck_coding"
          ? "The candidate is likely stuck. Provide a small hint without giving the full solution or final code."
          : state.id === "approach_discussion"
            ? "Discuss approach quality and guide toward an optimal solution."
            : "";

  const rolling_summary = store.main.rollingSummary ? `Rolling summary:\n${store.main.rollingSummary}` : "";
  const transcript_tail = transcriptTail.length ? `Transcript (last turns):\n${formatTranscriptTail(transcriptTail)}` : "";

  const code_snapshot_raw = (userCode ?? "").trim();
  const code_snapshot = code_snapshot_raw
    ? `Code snapshot (last 60 lines):\n${truncateLines(code_snapshot_raw, 60)}`
    : "";

  const agent_outputs = Object.keys(agentOutputs).length
    ? `Agent outputs (JSON):\n${JSON.stringify(agentOutputs)}`
    : "";

  const state_instructions = [
    "Return ONLY valid JSON: { message: string, store_updates?: StoreAction[] }",
    "Do not include markdown.",
    "Keep the message concise (1-3 short paragraphs).",
    "Ask at most one direct question unless necessary."
  ].join("\n");

  const userParts = [
    state_context,
    state_behavior_instruction,
    rolling_summary,
    transcript_tail,
    code_snapshot,
    agent_outputs,
    state_instructions
  ].filter((x) => x && x.trim().length > 0);

  return {
    system: system_persona,
    user: userParts.join("\n\n")
  };
}
