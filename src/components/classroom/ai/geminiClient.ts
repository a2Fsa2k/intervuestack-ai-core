import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiClient() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY. Add it to a .env.local file.");
  }
  return new GoogleGenerativeAI(apiKey);
}

function tryParseJsonWithSingleQuotes(raw: string): any {
  // Replace property names and string values with double quotes
  // This is a best-effort, not a full JS parser
  let fixed = raw
    // property names: 'key': → "key":
    .replace(/'([a-zA-Z0-9_]+)'\s*:/g, '"$1":')
    // string values: : 'value' or : 'value',
    .replace(/: '([^']*)'/g, ': "$1"')
    // string values in arrays: [ 'a', 'b' ]
    .replace(/\[\s*'([^']*)'\s*(,|\])/g, '["$1"$2')
    .replace(/,\s*'([^']*)'/g, ', "$1"');
  return JSON.parse(fixed);
}

function extractFirstJsonObject(raw: string): string | null {
  // Best-effort extraction of the first top-level JSON object.
  const start = raw.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      return raw.slice(start, i + 1);
    }
  }

  return null;
}

function coerceJsonFromModelText(txt: string): string {
  // Prefer fenced JSON if present
  const fenced = txt.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : txt;
  return candidate.trim();
}

function parseJsonBestEffort(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const obj = extractFirstJsonObject(raw);
    if (obj) {
      try {
        return JSON.parse(obj);
      } catch {
        // Try single-quote fallback
        return tryParseJsonWithSingleQuotes(obj);
      }
    }
    // Try single-quote fallback on full raw
    return tryParseJsonWithSingleQuotes(raw);
  }
}

type JsonValidator<T> = (value: unknown) => value is T;

export async function generateGeminiJSON<T>(opts: {
  model?: string;
  system: string;
  user: string;
  /** Optional temperature; keep undefined for defaults. */
  temperature?: number;
  /** Optional runtime validator for required-field checking. */
  validate?: JsonValidator<T>;
  /** Optional safe fallback to use if parsing/validation fails. */
  fallback?: T;
}): Promise<T> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: opts.model ?? "gemini-2.5-flash-lite" });

  const strictSuffix =
    "\n\nReturn ONLY valid JSON. No prose. No markdown. No explanation. Strictly follow the schema.";

  async function attempt(userPrompt: string): Promise<{ txt: string; value?: T; error?: unknown }> {
    try {
      const prompt = `${opts.system}\n\n${userPrompt}`;
      const res = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: opts.temperature != null ? { temperature: opts.temperature } : undefined
      });

      const txt = res.response.text();
      const raw = coerceJsonFromModelText(txt);
      const parsed = parseJsonBestEffort(raw);

      if (opts.validate && !opts.validate(parsed)) {
        return { txt, error: new Error("Schema validation failed") };
      }

      return { txt, value: parsed as T };
    } catch (error) {
      return { txt: "", error };
    }
  }

  // First try
  const first = await attempt(opts.user);
  if (first.value !== undefined) return first.value;

  // eslint-disable-next-line no-console
  console.warn("Gemini JSON parse/validate failed; retrying once.", {
    error: first.error,
    raw: first.txt
  });

  // Retry once with stricter instruction
  const second = await attempt(opts.user + strictSuffix);
  if (second.value !== undefined) return second.value;

  // eslint-disable-next-line no-console
  console.warn("Gemini JSON parse/validate failed after retry; using fallback if provided.", {
    error: second.error,
    raw: second.txt
  });

  if (opts.fallback !== undefined) return opts.fallback;

  // Preserve existing behavior if no fallback provided.
  // eslint-disable-next-line no-console
  console.error("Gemini returned non-JSON (no fallback):", second.txt || first.txt);
  throw new Error(`Gemini did not return valid JSON: ${second.txt || first.txt}`);
}
