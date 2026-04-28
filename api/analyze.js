// api/analyze.js — Vercel Serverless Function
// Securely calls Gemini AI with the hidden server-side API key.
// Called by the React app as: POST /api/analyze

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'AI service not configured on server' });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Gemini API error');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return res.json({ result: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
