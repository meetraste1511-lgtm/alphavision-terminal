// AI Provider Abstraction
// Supports Gemini (with web search fallback), Groq, and OpenRouter

/**
 * Common system prompt wrapper to enforce JSON output structure and autonomous bias
 */
const getSystemPrompt = (tradeStyle, assetName, riskPercent) => {
  const isScalp = tradeStyle === 'scalp';
  const minRR = isScalp ? 2.0 : 3.0;
  
  const styleInstruction = isScalp
    ? `This is a SCALP trade analysis. Target quick liquidity sweeps and micro-order block reactions. Minimum Risk:Reward is 1:${minRR}.` 
    : `This is a SWING trade analysis. Target major structural liquidity pools and 4H/Daily order blocks. Minimum Risk:Reward is 1:${minRR}.`;
    
  return `
You are the AlphaVision Quantitative Researcher (AV-QR), an elite algorithmic system.
Your objective is to perform an AUTONOMOUS analysis of ${assetName} to determine the most probable trade direction (Bias).

DO NOT take directional preference from the user. You are the decision-maker.

INSTITUTIONAL LOGIC PROTOCOLS:
1. DIRECTIONAL BIAS: Perform a Market Structure Shift (MSS) analysis. Determine if the setup is a LONG or SHORT based purely on liquidity sweeps and volume gaps.
2. LIQUIDITY-FIRST: Prioritize entries at recent "equal highs/lows" or "Fair Value Gaps" (FVG) where institutional stop-runs are likely.
3. LIVE PRICE ANCHOR: The absolute live current price right now is the ONLY valid starting point. All setups must be executable from this level.
4. STRICT RISK/REWARD: Target a minimum R:R of 1:${minRR}. If the technical structure does not support this ratio, you MUST assign a confidence < 50.
5. STYLE ADHERENCE: ${styleInstruction}
6. ASSET IDENTITY: You are analyzing ${assetName} and ONLY ${assetName}. Hallucinating or referencing another asset (even from memory samples) is a CRITICAL SYSTEM FAILURE. Every line of your analysis must be specific to ${assetName}.
7. TERMINAL TONE: Use clinical, monospaced-style financial terminology. Be concise, objective, and authoritative.

JSON OUTPUT FORMAT (STRICT):
Return ONLY a valid JSON object. No markdown, no conversational text.
{
  "liveContext": "AV-QR Context: Price is reacting to [Structural Level]. Bias is [AUTONOMOUS DIRECTION]. News/Sentiment: [Optional Context].",
  "timeframes": {
    "1m": {
      "bias": "LONG/SHORT",
      "confidence": number,
      "entry": "numerical",
      "stopLoss": "numerical",
      "takeProfit": "numerical",
      "riskReward": "1:X",
      "estimatedTime": "duration",
      "analysis": "AV-QR Analysis: MSS detected at [Level]. [Bias] entry at [Level] targeting liquidity at [Level]."
    },
    // ... repeat for 5m, 15m, 1H, 4H, Daily
  }
}
`;
};

/**
 * Gemini Provider (Built-in web search option)
 */
async function callGemini(prompt, userId, symbol) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, userId, symbol })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to analyze via Institutional API');
  return data.result;
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
  let content = data.choices[0]?.message?.content || "";
  
  if (content && typeof content === 'string' && content.includes('</think>')) {
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
export async function analyzeWithProvider(provider, keys, config, userId) {
  const { tradeStyle, assetName, riskPercent, marketDataText, currentPrice, imageBase64, isImageMode } = config;
  
  const systemPrompt = getSystemPrompt(tradeStyle, assetName, riskPercent);
  
  // Build final prompt
  let finalPrompt = systemPrompt;
  
  // CRITICAL SAFETY CHECK: If no real data is present, do NOT allow hallucination.
  const hasNoData = !marketDataText || marketDataText.includes('unavailable') || marketDataText.includes('returned no results');
  
  if (inputMode === 'direct' && hasNoData) {
    return JSON.stringify({
      liveContext: "CRITICAL: Institutional market data feeds are currently offline for this symbol. No analysis possible.",
      timeframes: {} 
    });
  }

  if (isImageMode) {
    finalPrompt += `\n\n[USER PROVIDED A CHART IMAGE. ANALYZE THE PRICE ACTION VISUALLY.]`;
  } else {
    finalPrompt += `\n\n[LIVE MARKET DATA SUPPLIED BY INSTITUTIONAL API]\n`;
    if (currentPrice) {
      finalPrompt += `CRITICAL ANCHOR: The absolute live current price right now is exactly ${currentPrice}. 
      All your generated levels (Entry, SL, TP) MUST be mathematically relative to this price. 
      If you cannot find this price in the provided OHLC data, you must prioritize the LIVE ANCHOR over the historical data.\n\n`;
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
      rawResponse = await callGemini(finalPrompt, userId, assetName);
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
