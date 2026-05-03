import { createClient } from '@supabase/supabase-js';

let supabase = null;
try {
  if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
  }
} catch (e) {
  console.warn("Supabase initialization skipped in analyze.js:", e.message);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, userId, symbol } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'AI service not configured on server' });

  try {
    // 🧠 FETCH LEARNING DATA (MEMORY)
    let memoryContext = "";
    if (userId && supabase) {
      const { data: logs } = await supabase
        .from('ai_training_logs')
        .select('ai_analysis, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (logs && logs.length > 0) {
        const validated = logs.filter(l => l.status === 'validated').map(l => l.ai_analysis).join("\n---\n");
        const invalidated = logs.filter(l => l.status === 'invalidated').map(l => l.ai_analysis).join("\n---\n");
        
        memoryContext = `
[REINFORCEMENT LEARNING CONTEXT - LOGIC ONLY]
The following are SAMPLES of your previous work. Use them ONLY to understand the formatting and depth of logic required. 
IMPORTANT: DO NOT analyze the assets mentioned in these samples. They are HISTORICAL.
Current Mission: You must analyze ONLY the asset requested in the 'PROMPT' below.

APPROVED LOGICAL PATTERNS:
${validated || "No previous validated samples yet."}

REJECTED PATTERNS (DO NOT REPEAT):
${invalidated || "No previous invalidated samples yet."}
---
`;
      }
    }

    const finalPrompt = memoryContext + prompt;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    );

    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'Gemini API error');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return res.json({ result: text });
  } catch (err) {
    console.error('Server Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

