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

export async function generateGeminiJSON<T>(opts: {
  model?: string;
  system: string;
  user: string;
}): Promise<T> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: opts.model ?? "gemini-2.5-flash-lite" });

  const prompt = `${opts.system}\n\n${opts.user}`;
  const res = await model.generateContent(prompt);

  const txt = res.response.text();

  // Try to extract JSON from fenced or raw responses.
  const fenced = txt.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = fenced ? fenced[1] : txt;

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to extract first {...} block
    const maybe = raw.match(/\{[\s\S]*?\}/);
    if (maybe) {
      try {
        return JSON.parse(maybe[0]) as T;
      } catch {
        // Try single-quote fallback
        try {
          return tryParseJsonWithSingleQuotes(maybe[0]) as T;
        } catch {}
      }
    }
    // Try single-quote fallback on full raw
    try {
      return tryParseJsonWithSingleQuotes(raw) as T;
    } catch {}
    // eslint-disable-next-line no-console
    console.error("Gemini returned non-JSON:", txt);
    throw new Error(`Gemini did not return valid JSON: ${txt}`);
  }
}
