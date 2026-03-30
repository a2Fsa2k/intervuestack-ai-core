export interface ElevenLabsSttResponse {
  text?: string;
  // other fields ignored
  [k: string]: unknown;
}

export async function transcribeWithElevenLabs(audio: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("audio", audio, "recording.webm");

  const r = await fetch("/api/stt", {
    method: "POST",
    body: fd
  });

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(txt || `STT failed: ${r.status}`);
  }

  const json = (await r.json()) as ElevenLabsSttResponse;
  const text = (json.text ?? "").trim();
  if (!text) throw new Error("No transcript returned from STT");
  return text;
}
