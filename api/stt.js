// Vercel serverless function — proxies OpenAI Whisper STT.
// Client sends audio as base64 JSON; server decodes and forwards.
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.OPENAI_API_KEY ?? process.env.VITE_OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  const { audio, mime } = req.body;
  if (!audio) return res.status(400).json({ error: "Missing audio" });

  const buffer = Buffer.from(audio, "base64");
  const blob = new Blob([buffer], { type: mime || "audio/webm" });

  const fd = new FormData();
  fd.append("file", blob, "recording.webm");
  fd.append("model", "gpt-4o-mini-transcribe");
  fd.append("language", "en");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });

  const data = await r.json();
  return res.status(r.status).json(data);
}
