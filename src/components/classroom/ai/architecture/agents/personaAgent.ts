import { generateOpenAIJSON } from "../../openaiClient";

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

  const user = [
    "Return ONLY valid JSON with keys: interviewerStyle, probingStyle, tone.",
    `Topic: ${selectedTopic ?? "(none)"}`,
    `Difficulty: ${difficulty}`,
    "Examples of values:",
    "- interviewerStyle: concise and analytical",
    "- probingStyle: calm but probing",
    "- tone: friendly but challenging"
  ].join("\n");

  return generateOpenAIJSON<PersonaStyle>({
    system: "You output stable interviewing style settings for a DSA interviewer.",
    user,
    model: "gpt-4o-mini",
    temperature: 0.2,
    validate: (v: unknown): v is PersonaStyle => {
      if (!v || typeof v !== "object") return false;
      const o = v as Record<string, unknown>;
      return typeof o.interviewerStyle === "string" && typeof o.probingStyle === "string" && typeof o.tone === "string";
    },
    fallback: {
      interviewerStyle: "concise and analytical",
      probingStyle: "calm but probing",
      tone: "neutral-positive"
    }
  });
}
