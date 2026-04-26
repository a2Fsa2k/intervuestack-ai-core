import OpenAI from "openai";

function getOpenAIClient() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("Missing VITE_OPENAI_API_KEY. Add it to a .env.local file.");
  }

  // Browser usage is allowed here; this is a demo/prototype environment.
  // For production, proxy these calls through a server to keep keys private.
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

type JsonValidator<T> = (value: unknown) => value is T;

function extractFirstJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) return raw.slice(start, i + 1);
  }

  return null;
}

function parseJsonBestEffort(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const obj = extractFirstJsonObject(raw);
    if (!obj) throw new Error("No JSON object found in model output");
    return JSON.parse(obj);
  }
}

export async function generateOpenAIText(opts: {
  model?: string;
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const client = getOpenAIClient();

  const res = await client.chat.completions.create({
    model: opts.model ?? "gpt-4o-mini",
    temperature: opts.temperature,
    max_tokens: opts.maxOutputTokens,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user }
    ]
  });

  return (res.choices[0]?.message?.content ?? "").trim();
}

export async function generateOpenAIJSON<T>(opts: {
  model?: string;
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
  validate?: JsonValidator<T>;
  fallback?: T;
}): Promise<T> {
  const strictSuffix =
    "\n\nReturn ONLY valid JSON. No prose. No markdown. No explanation. Strictly follow the schema.";

  const attempt = async (user: string): Promise<{ raw: string; value?: T }> => {
    const raw = await generateOpenAIText({
      model: opts.model,
      system: opts.system,
      user,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens
    });

    try {
      const parsed = parseJsonBestEffort(raw);
      if (opts.validate && !opts.validate(parsed)) {
        // eslint-disable-next-line no-console
        console.warn("OpenAI JSON schema validate failed", { raw });
        return { raw };
      }
      return { raw, value: parsed as T };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("OpenAI JSON parse failed", { raw, error: e });
      return { raw };
    }
  };

  const first = await attempt(opts.user);
  if (first.value !== undefined) return first.value;

  // Retry once with strict instruction
  const second = await attempt(opts.user + strictSuffix);
  if (second.value !== undefined) return second.value;

  if (opts.fallback !== undefined) return opts.fallback;
  throw new Error(`OpenAI did not return valid JSON: ${second.raw || first.raw}`);
}
