const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_STT_MODEL_ID = process.env.ELEVENLABS_STT_MODEL_ID || 'scribe_v1';

if (!ELEVENLABS_API_KEY) {
  console.warn('[server] Missing ELEVENLABS_API_KEY in .env.local');
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const app = express();
app.use(cors());

app.get('/api/health', (_, res) => {
  res.json({ ok: true });
});

app.post('/api/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'Missing ELEVENLABS_API_KEY' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Missing audio file' });
    }

    const fd = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/octet-stream' });
    fd.append('file', blob, req.file.originalname || 'audio.webm');
    fd.append('model_id', ELEVENLABS_STT_MODEL_ID);
    fd.append('language_code', 'en');

    const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: fd
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(r.status).send(text);
    }

    // Expected shape: { text: "..." , ... }
    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch {
      return res.send(text);
    }
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

const port = process.env.STT_PROXY_PORT ? Number(process.env.STT_PROXY_PORT) : 8787;
app.listen(port, () => {
  console.log(`[server] STT proxy listening on http://localhost:${port}`);
});
