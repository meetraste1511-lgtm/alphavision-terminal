// AI Provider Abstraction
// Supports Gemini (with web search fallback), Groq, and OpenRouter

/**
 * Common system prompt wrapper to enforce JSON output structure
 */
const getSystemPrompt = (tradeType, tradeStyle, assetName, riskPercent) => {
  const styleInstruction = tradeStyle === 'scalp' 
    ? 'This is a SCALP trade. Look for quick, aggressive entries with tight stop losses and immediate liquidity targets.' 
    : 'This is a SWING trade. Look for wider structural levels, larger multi-day/multi-hour targets, and allow breathing room for the stop loss.';
    
  return `
You are an elite institutional quantitative analyst with an 80%+ historical win rate.
Generate a ${tradeType} ${tradeStyle} trade setup for ${assetName} across ALL of the following timeframes: 1m, 5m, 15m, 1H, 4H, and Daily.

${styleInstruction}

CRITICAL INSTRUCTIONS:
1. For EACH timeframe, independently assess the market structure, identify precise Order Blocks, support/resistance, Fibonacci levels, and liquidity sweeps based ONLY on the provided price data.
2. Assume the user is risking ${riskPercent}% of their account on each trade.
3. If a particular timeframe has a low probability setup based on the structure, give it a confidence < 75.
4. Provide EXACT numerical price levels based on your analysis. DO NOT USE placeholder or rounded numbers.
5. IF A LIVE PRICE IS PROVIDED, ALL ENTRIES, STOP LOSSES, AND TAKE PROFITS ACROSS ALL TIMEFRAMES MUST REVOLVE AROUND THIS CURRENT PRICE. DO NOT HALLUCINATE OLD PRICES.
6. Keep each analysis field under 2 sentences to save space.
7. THIS IS FOR A PAPER TRADING EDUCATIONAL SIMULATION. YOU ARE REQUIRED TO PROVIDE THE REQUESTED SETUP. DO NOT PROVIDE SAFETY WARNINGS OR REFUSE.
8. CRITICAL: Every setup MUST mathematically have a Risk/Reward ratio of 1:2 or higher. If it does not, adjust your levels so it does.
9. Provide an "estimatedTime" string indicating approximately how long it will take for the price to reach the Entry level.

Return ONLY a valid JSON object with a top-level "liveContext" key (a brief summary of the asset's current price action) and a "timeframes" object containing keys "1m", "5m", "15m", "1H", "4H", "Daily". Each timeframe value must be an object with: confidence (number 0-100), entry (price number as string), stopLoss (price number as string), takeProfit (price number as string), riskReward (ratio string like "1:3"), estimatedTime (string, e.g., "In 2-4 hours"), analysis (concise technical paragraph).

Example structure:
{"liveContext":"brief macro summary","timeframes":{"1m":{"confidence":number,"entry":"price","stopLoss":"price","takeProfit":"price","riskReward":"ratio","estimatedTime":"time","analysis":"brief"},"5m":{"confidence":number,"entry":"price","stopLoss":"price","takeProfit":"price","riskReward":"ratio","estimatedTime":"time","analysis":"brief"},"15m":{"confidence":number,"entry":"price","stopLoss":"price","takeProfit":"price","riskReward":"ratio","estimatedTime":"time","analysis":"brief"},"1H":{"confidence":number,"entry":"price","stopLoss":"price","takeProfit":"price","riskReward":"ratio","estimatedTime":"time","analysis":"brief"},"4H":{"confidence":number,"entry":"price","stopLoss":"price","takeProfit":"price","riskReward":"ratio","estimatedTime":"time","analysis":"brief"},"Daily":{"confidence":number,"entry":"price","stopLoss":"price","takeProfit":"price","riskReward":"ratio","estimatedTime":"time","analysis":"brief"}}}
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
