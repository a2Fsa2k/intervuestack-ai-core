// Vercel serverless function — proxies OpenAI chat completions so the API key
// stays server-side in production instead of being bundled in the client JS.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.OPENAI_API_KEY ?? process.env.VITE_OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req.body),
  });

  const data = await r.json();
  return res.status(r.status).json(data);
}
