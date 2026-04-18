import { generateGeminiJSON } from "../../geminiClient";

export interface PersonaStyle {
  interviewerStyle: string;
  probingStyle: string;
  tone: string;
}

/**
 * Persona style signal provider.
 * Returns structured style knobs only; no user-facing questions/messages.
 */
export async function personaAgent(opts: {
  selectedTopic?: string;
  difficulty: "easy" | "medium";
}): Promise<PersonaStyle> {
  const { selectedTopic, difficulty } = opts;

  // Lightweight prompt; keep it stable to reduce prompt tokens.
  const user = [
    "Return ONLY valid JSON with keys: interviewerStyle, probingStyle, tone.",
    `Topic: ${selectedTopic ?? "(none)"}`,
    `Difficulty: ${difficulty}`,
    "Examples of values:",
    "- interviewerStyle: concise and analytical",
    "- probingStyle: calm but probing",
    "- tone: friendly but challenging"
  ].join("\n");

  return generateGeminiJSON<PersonaStyle>({
    system: "You output stable interviewing style settings for a DSA interviewer.",
    user
  });
}
