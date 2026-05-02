// Global cache object (persistent in local dev, best-effort in Vercel)
const PRICE_CACHE = {};
const CACHE_DURATION = 30 * 1000; // 30 seconds

export default async function handler(req, res) {
  // Allow CORS from our own frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { symbol, exchange, timeframe, ohlc } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });

  const upper = symbol.toUpperCase();
  const upperEx = (exchange || '').toUpperCase();
  const tf = timeframe || '1H';
  const cacheKey = `${upper}_${upperEx}_${tf}_${!!ohlc}`;

  // Check Cache
  const cached = PRICE_CACHE[cacheKey];
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    return res.json({ ...cached.data, cached: true });
  }

  // Wrapper for caching before returning
  const sendJson = (data) => {
    PRICE_CACHE[cacheKey] = { timestamp: Date.now(), data };
    return res.json(data);
  };

  // ── Universal Symbol Resolver ───────────────────────────────────────────
  let livePrice = null;
  let liveStats = {};

  // 1. Check Groww for Indian Indices
  if (GROWW_MAP[upper]) {
    try {
      const r = await fetch(`https://groww.in/v1/api/stocks_data/v1/tr_live_indices/exchange/NSE/segment/CASH/${GROWW_MAP[upper]}/latest`);
      if (r.ok) {
        const d = await r.json();
        const rawVal = d.value ?? d.close;
        const val = parseFloat(rawVal);
        if (!isNaN(val) && val > 0) {
          livePrice = val.toFixed(2);
          liveStats = {
            price: livePrice,
            open: parseFloat(d.open ?? rawVal).toFixed(2),
            high: parseFloat(d.high ?? rawVal).toFixed(2),
            low: parseFloat(d.low ?? rawVal).toFixed(2),
            source: 'Groww (Real-time)'
          };
          if (!ohlc) return sendJson({ symbol: upper, ...liveStats });
        }
      }
    } catch (e) {}
  }

  // 2. Check Binance for Crypto (Universal)
  const isCrypto = upper.endsWith('USDT') || upper.endsWith('USD') || 
                   upperEx === 'BINANCE' || 
                   ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'DOGE', 'AVAX', 'DOT', 'MATIC', 'PEPE', 'SHIB', 'TRX', 'LINK', 'UNI', 'LTC'].some(s => upper.startsWith(s));

  if (isCrypto) {
    let binSym = upper.replace('USD', 'USDT');
    if (!binSym.endsWith('USDT')) binSym += 'USDT';
    
    try {
      const binInterval = { '1m':'1m', '5m':'5m', '15m':'15m', '1H':'1h', '4H':'4h', 'Daily':'1d' }[tf] || '1h';
      const endpoint = ohlc ? `klines?symbol=${binSym}&interval=${binInterval}&limit=30` : `ticker/price?symbol=${binSym}`;
      const r = await fetch(`https://api.binance.com/api/v3/${endpoint}`);
      if (r.ok) {
        const d = await r.json();
        if (ohlc) {
          const rows = d.reverse().map(k => `${new Date(k[0]).toISOString()} | O:${parseFloat(k[1]).toFixed(2)} H:${parseFloat(k[2]).toFixed(2)} L:${parseFloat(k[3]).toFixed(2)} C:${parseFloat(k[4]).toFixed(2)}`);
          return sendJson({ symbol: upper, price: parseFloat(d[0][4]).toFixed(2), data: rows.join('\n'), source: 'Binance (Live)' });
        }
        return sendJson({ symbol: upper, price: parseFloat(d.price).toFixed(2), source: 'Binance (Live)' });
      }
    } catch (e) {}
  }

  // 3. Yahoo Finance Global (The Universal Fallback)
  const YAHOO_MAP = {
    SENSEX: '^BSESN', NIFTY: '^NSEI', BANKNIFTY: '^NSEBANK',
    SPX: '^GSPC', SP500: '^GSPC', NDX: '^NDX', NASDAQ: '^IXIC', DJI: '^DJI',
    GOLD: 'GC=F', XAUUSD: 'GC=F', SILVER: 'SI=F', CRUDEOIL: 'CL=F', DXY: 'DX-Y.NYB',
    VIX: '^VIX', BTC: 'BTC-USD', ETH: 'ETH-USD',
    SUZLON: 'SUZLON.NS', ZOMATO: 'ZOMATO.NS', PAYTM: 'PAYTM.NS', JIOFIN: 'JIOFIN.NS'
  };

  let yahooSym = YAHOO_MAP[upper] ?? upper;
  if (!yahooSym.includes('^') && !yahooSym.includes('=') && !yahooSym.includes('-')) {
    if (upperEx === 'NSE') yahooSym += '.NS';
    else if (upperEx === 'BSE') yahooSym += '.BO';
    else if (!isCrypto && upper.length > 3 && ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'].some(s => upper.includes(s))) yahooSym += '.NS';
  }

  try {
    const ytf = { '1m':'1m', '5m':'5m', '15m':'15m', '1H':'1h', '4H':'1h', 'Daily':'1d' }[tf] || '1h';
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${ytf}&range=5d`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (r.ok) {
      const d = await r.json();
      const resData = d.chart?.result?.[0];
      if (resData) {
        const meta = resData.meta;
        const yahooPrice = meta?.regularMarketPrice ?? meta?.previousClose;
        const finalPrice = livePrice || (yahooPrice ? parseFloat(yahooPrice).toFixed(2) : null);
        if (ohlc) {
          const timestamps = resData.timestamp ?? [];
          const quote = resData.indicators?.quote?.[0] ?? {};
          const rows = [];
          for (let i = timestamps.length - 1; i >= Math.max(0, timestamps.length - 30); i--) {
            if (quote.close?.[i]) rows.push(`${new Date(timestamps[i] * 1000).toISOString()} | O:${parseFloat(quote.open[i]).toFixed(2)} H:${parseFloat(quote.high[i]).toFixed(2)} L:${parseFloat(quote.low[i]).toFixed(2)} C:${parseFloat(quote.close[i]).toFixed(2)}`);
          }
          let finalData = rows.join('\n');
          if (livePrice) finalData = `⚡ REAL-TIME ANCHOR: ${livePrice} | O:${liveStats.open} H:${liveStats.high} L:${liveStats.low}\n` + finalData;
          return sendJson({ symbol: upper, price: finalPrice, data: finalData, source: livePrice ? 'Institutional Bridge' : 'Global Feed' });
        }
        if (finalPrice) return sendJson({ symbol: upper, price: finalPrice, source: livePrice ? 'Institutional Bridge' : 'Global Feed' });
      }
    }
  } catch (e) {}

  // 4. Twelve Data Final Fallback (Heavy Duty)
  const TD_KEY = process.env.VITE_TWELVEDATA_API_KEY || process.env.TWELVEDATA_API_KEY;
  if (TD_KEY) {
    try {
      const tdEx = upperEx || (upper.length > 3 ? 'NSE' : '');
      const url = `https://api.twelvedata.com/price?symbol=${upper}&exchange=${tdEx}&apikey=${TD_KEY}`;
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        if (d.price) return sendJson({ symbol: upper, price: parseFloat(d.price).toFixed(2), source: 'Tier-1 Backup' });
      }
    } catch (e) {}
  }

  return res.status(404).json({ error: `Price data for ${symbol} is currently offline.` });
}
