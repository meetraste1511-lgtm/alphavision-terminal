import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Authorization check (only Vercel Cron or Admin can call this)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Starting Autonomous Sentiment Sync...');

    // 1. Fetch Global Financial News (RSS Feed or Public API)
    // Using Yahoo Finance RSS for a reliable, keyless macro feed
    const rssResponse = await fetch('https://finance.yahoo.com/news/rssindex');
    const xml = await rssResponse.text();
    
    // Simple regex to extract titles (in a real app, use a proper XML parser)
    const titles = xml.match(/<title>(.*?)<\/title>/g) || [];
    const newsSummary = titles.slice(2, 12).map(t => t.replace(/<\/?title>/g, '')).join(' | ');

    // 2. Use Gemini to calculate a Global Sentiment Score (-100 to 100)
    const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Analyze the following news headlines and return ONLY a JSON object with:
            1. "sentimentScore": integer between -100 (Extremely Bearish) and 100 (Extremely Bullish)
            2. "topTheme": 1-sentence summary of the main market driver.
            
            Headlines: ${newsSummary}` }] }],
          generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
        })
      }
    );

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.candidates[0].content.parts[0].text);

    // 3. Save to Supabase
    const { error } = await supabase
      .from('market_sentiment')
      .insert({
        score: result.sentimentScore,
        theme: result.topTheme,
        raw_news: newsSummary.substring(0, 500)
      });

    if (error) throw error;

    return res.json({ 
      success: true, 
      sentiment: result.sentimentScore, 
      theme: result.topTheme 
    });

  } catch (err) {
    console.error('Sync Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
