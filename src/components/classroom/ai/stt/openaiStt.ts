import OpenAI from "openai";

export interface OpenAISttOptions {
  apiKey?: string;
  model?: string;
  language?: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function transcribeWithOpenAI(audio: Blob, opts: OpenAISttOptions = {}): Promise<string> {
  if (audio.size === 0) throw new Error("Empty audio");

  // Production: proxy through serverless function so the API key stays server-side.
  if (!import.meta.env.DEV) {
    const base64 = await blobToBase64(audio);
    const r = await fetch("/api/stt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: base64, mime: audio.type }),
    });
    if (!r.ok) throw new Error(`STT proxy: ${r.status}`);
    const data = await r.json();
    const text = (data.text ?? "").trim();
    if (!text) throw new Error("No transcript returned from STT");
    return text;
  }

  // Dev: direct from browser is fine.
  const apiKey = opts.apiKey ?? (import.meta.env.VITE_OPENAI_API_KEY as string | undefined);
  if (!apiKey) throw new Error("Missing VITE_OPENAI_API_KEY.");

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

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
