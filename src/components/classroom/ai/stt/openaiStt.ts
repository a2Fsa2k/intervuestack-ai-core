import OpenAI from "openai";

export interface OpenAISttOptions {
  apiKey?: string;
  model?: string;
  language?: string;
}

export async function transcribeWithOpenAI(audio: Blob, opts: OpenAISttOptions = {}): Promise<string> {
  const apiKey = opts.apiKey ?? (import.meta.env.VITE_OPENAI_API_KEY as string | undefined);
  if (!apiKey) throw new Error("Missing VITE_OPENAI_API_KEY.");

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  if (audio.size === 0) throw new Error("Empty audio");

  const file = new File([audio], "recording.webm", { type: audio.type || "audio/webm" });

  const res = await client.audio.transcriptions.create({
    file,
    model: opts.model ?? "gpt-4o-mini-transcribe",
    language: opts.language ?? "en"
  });

  const text = (res.text ?? "").trim();
  if (!text) throw new Error("No transcript returned from STT");
  return text;
}
