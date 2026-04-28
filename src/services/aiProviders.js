// AI Provider Abstraction
// Supports Gemini (with web search fallback), Groq, and OpenRouter

/**
 * Common system prompt wrapper to enforce JSON output structure
 */
const getSystemPrompt = (tradeType, tradeStyle, assetName, riskPercent) => {
  const isScalp = tradeStyle === 'scalp';
  const minRR = isScalp ? 2.0 : 3.0;
  
  const styleInstruction = isScalp
    ? `This is a SCALP trade. Target quick liquidity sweeps. Absolute minimum Risk:Reward is 1:${minRR}. Stop Loss MUST be extremely tight behind the nearest 1m/5m order block.` 
    : `This is a SWING trade. Target major structural liquidity pools. Absolute minimum Risk:Reward is 1:${minRR}. Allow breathing room for the stop loss behind major 1H/4H swing pivots.`;
    
  return `
You are AlphaVision Core, an elite institutional quantitative trading algorithm developed with Google-grade precision.
Your objective is to generate a highly precise, mathematically sound ${tradeType} ${tradeStyle} setup for ${assetName} across ALL of the following timeframes: 1m, 5m, 15m, 1H, 4H, and Daily.

${styleInstruction}

CRITICAL QUANTITATIVE GUARDRAILS (YOU MUST OBEY):
1. LIVE PRICE ANCHORING: The provided Live Price is absolute. Every Entry price MUST mathematically align near this anchor. Do NOT hallucinate past/future prices as the current state.
2. STRICT RISK/REWARD: Every setup MUST mathematically have a Risk/Reward ratio of 1:${minRR} or higher. You must calculate: (Take Profit - Entry) / (Entry - Stop Loss). If the math fails, tighten the Stop Loss or push the Take Profit further.
3. THE "WATCHLIST" PROTOCOL (NO RANDOM TRADES): If the market is choppy, ranging, or lacks clear institutional structure, DO NOT force a bad trade. Instead, assign a confidence < 50, provide a safe hypothetical setup at extreme boundaries, and use the analysis to clearly explain to the user why the market is risky right now. Treat the user as an intelligent partner — educate them on the risk.
4. INSTITUTIONAL TONE: Use clinical, algorithmic financial terminology. No retail jargon. Be concise, precise, and highly professional.

JSON OUTPUT FORMAT:
You must return ONLY a valid JSON object matching exactly this structure. Do not wrap it in markdown blockquotes.
{
  "liveContext": "A 2-sentence professional macro summary of current market conditions and structural bias.",
  "timeframes": {
    "1m": {
      "confidence": number (0-100),
      "entry": "exact numerical price",
      "stopLoss": "exact numerical price",
      "takeProfit": "exact numerical price",
      "riskReward": "ratio string e.g. 1:3.2",
      "estimatedTime": "approx time to trigger",
      "analysis": "Clinical analysis: Structural bias is [Direction]. Entry triggered at [Level] targeting liquidity at [Level]. Invalidated if [Condition]."
    },
    // ... repeat identical structure for "5m", "15m", "1H", "4H", "Daily"
  }
}
`;
};

/**
 * Gemini Provider (Built-in web search option)
 */
async function callGemini(apiKey, prompt, imageBase64) {
  const parts = [{ text: prompt }];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
    })
  });

  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || 'Failed to analyze via Gemini');

  let resultText = '';
  for (const part of data.candidates[0].content.parts) {
    if (part.text) resultText += part.text;
  }
  return resultText;
}

/**
 * Groq Provider (Fast Llama 3)
 */
async function callGroq(apiKey, prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || 'Failed to analyze via Groq');
  return data.choices[0].message.content;
}

/**
 * OpenRouter Provider (DeepSeek R1)
 */
async function callOpenRouter(apiKey, prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5173', 
      'X-Title': 'AlphaVision Terminal',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || 'Failed to analyze via OpenRouter');
  
  // DeepSeek R1 returns thinking inside <think> tags, we need to strip it to get the JSON
  let content = data.choices[0].message.content;
  if (content.includes('</think>')) {
    content = content.split('</think>')[1].trim();
  }
  return content;
}

/**
 * Pollinations Provider (Completely Free, No Key Required)
 */
async function callPollinations(prompt) {
  const response = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      jsonMode: true,
      seed: Math.floor(Math.random() * 1000000)
    })
  });

  if (!response.ok) throw new Error('Failed to analyze via Keyless AI');
  return await response.text();
}

/**
 * Main Analysis Entry Point
 */
export async function analyzeWithProvider(provider, keys, config) {
  const { tradeType, tradeStyle, assetName, riskPercent, marketDataText, currentPrice, imageBase64, isImageMode } = config;
  
  const systemPrompt = getSystemPrompt(tradeType, tradeStyle, assetName, riskPercent);
  
  // Build final prompt
  let finalPrompt = systemPrompt;
  if (isImageMode) {
    finalPrompt += `\n\n[USER PROVIDED A CHART IMAGE. ANALYZE THE PRICE ACTION VISUALLY.]`;
  } else {
    finalPrompt += `\n\n[LIVE MARKET DATA SUPPLIED BY TWELVE DATA API]\n`;
    if (currentPrice) {
      finalPrompt += `CRITICAL ANCHOR: The absolute live current price right now is exactly ${currentPrice}. ALL your entries, stop losses, and take profits MUST be positioned realistically around this exact live price level. Do NOT use historical prices or assume the price is different.\n\n`;
    }
    finalPrompt += `${marketDataText}`;
    if (provider === 'gemini') {
      finalPrompt += `\n\n[Additionally, use your googleSearch tool to find any breaking news affecting ${assetName} right now.]`;
    }
  }

  // Route to provider
  let rawResponse = '';
  switch (provider) {
    case 'gemini':
      if (!keys.gemini) throw new Error("Gemini API key is missing. Add it in Settings.");
      rawResponse = await callGemini(keys.gemini, finalPrompt, imageBase64);
      break;
    case 'groq':
      if (!keys.groq) throw new Error("Groq API key is missing. Add it in Settings.");
      if (isImageMode) throw new Error("Groq does not support image upload yet. Switch to Direct Mode or use Gemini.");
      rawResponse = await callGroq(keys.groq, finalPrompt);
      break;
    case 'openrouter':
      if (!keys.openrouter) throw new Error("OpenRouter API key is missing. Add it in Settings.");
      if (isImageMode) throw new Error("OpenRouter (DeepSeek) does not support image upload yet. Switch to Direct Mode or use Gemini.");
      rawResponse = await callOpenRouter(keys.openrouter, finalPrompt);
      break;
    case 'pollinations':
      if (isImageMode) throw new Error("Keyless AI does not support image upload yet. Switch to Direct Mode.");
      rawResponse = await callPollinations(finalPrompt);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  // Parse and repair JSON
  let cleanJson = rawResponse;
  
  // Extract just the JSON object from conversational text
  const firstBrace = cleanJson.indexOf('{');
  const lastBrace = cleanJson.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
  } else {
    // If there are no braces, the model likely returned a safety refusal or plain text
    throw new Error(`AI generated non-JSON text. It may have hit a safety filter. Raw output: ${cleanJson.substring(0, 150)}...`);
  }
  
  cleanJson = cleanJson.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleanJson);
  } catch (err) {
    // Attempt auto-repair for truncated JSON
    let fixed = cleanJson;
    const quoteCount = (fixed.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) fixed += '"';
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
    return JSON.parse(fixed);
  }
}
