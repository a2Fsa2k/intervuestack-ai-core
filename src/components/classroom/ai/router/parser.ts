import type { RouterLLMOutput } from "./types";

function stripMarkdownFences(raw: string): string {
  return raw.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
}

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
  const cleaned = stripMarkdownFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const obj = extractFirstJsonObject(cleaned);
    if (!obj) throw new Error("No JSON object found");
    return JSON.parse(obj);
  }
}

export function validateRouterOutput(v: unknown): v is RouterLLMOutput {
  if (!v || typeof v !== "object") return false;
  const o = v as any;
  return typeof o.message === "string";
}

export function parseRouterOutput(raw: string, fallback: RouterLLMOutput): RouterLLMOutput {
  try {
    const parsed = parseJsonBestEffort(raw);
    if (validateRouterOutput(parsed)) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}
