// api/live-price.js — Vercel Serverless Function
// Fetches live market prices server-side (no CORS restrictions)
// Called by the React app as: GET /api/live-price?symbol=NIFTY

export default async function handler(req, res) {
  // Allow CORS from our own frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { symbol, timeframe, ohlc } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });

  const upper = symbol.toUpperCase();
  const tf = timeframe || '1H';

  // ── Indian Indices via Groww (Real-time price) ───────────────────────────
  const GROWW_MAP = { NIFTY: 'NIFTY', BANKNIFTY: 'BANKNIFTY', FINNIFTY: 'FINNIFTY' };
  let livePrice = null;
  let liveStats = {};

  if (GROWW_MAP[upper]) {
    try {
      const r = await fetch(
        `https://groww.in/v1/api/stocks_data/v1/tr_live_indices/exchange/NSE/segment/CASH/${GROWW_MAP[upper]}/latest`
      );
      if (r.ok) {
        const d = await r.json();
        const rawVal = d.value ?? d.close;
        const val = parseFloat(rawVal);
        if (!isNaN(val) && val > 0) {
          livePrice = val.toFixed(2);
          liveStats = {
            open:  parseFloat(d.open  ?? rawVal).toFixed(2),
            high:  parseFloat(d.high  ?? rawVal).toFixed(2),
            low:   parseFloat(d.low   ?? rawVal).toFixed(2),
            close: parseFloat(d.close ?? rawVal).toFixed(2)
          };
          // If ONLY price is needed (not OHLC), return now
          if (!ohlc) return res.json({ symbol: upper, price: livePrice, ...liveStats, source: 'Groww' });
        }
      }
    } catch (e) { console.error('Groww Error:', e.message); }
  }

  // ── Crypto via Binance ────────────────────────────────────────────────────
  const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK', 'DOT'];
  const isCrypto = cryptoSymbols.some(s => upper.includes(s)) || upper.endsWith('USDT') || upper.endsWith('BTC');
  if (isCrypto) {
    let binSym = upper;
    if (!upper.includes('USDT') && !upper.includes('BTC') && !upper.includes('ETH')) {
      binSym = upper + 'USDT';
    }
    try {
      const binInterval = { '1m':'1m', '5m':'5m', '15m':'15m', '1H':'1h', '4H':'4h', 'Daily':'1d' }[tf] || '1h';
      const endpoint = ohlc ? `klines?symbol=${binSym}&interval=${binInterval}&limit=30` : `ticker/price?symbol=${binSym}`;
      const r = await fetch(`https://api.binance.com/api/v3/${endpoint}`);
      if (r.ok) {
        const d = await r.json();
        if (ohlc) {
          const rows = d.reverse().map(k => `${new Date(k[0]).toISOString()} | O:${parseFloat(k[1]).toFixed(2)} H:${parseFloat(k[2]).toFixed(2)} L:${parseFloat(k[3]).toFixed(2)} C:${parseFloat(k[4]).toFixed(2)}`);
          return res.json({ symbol: upper, price: parseFloat(d[0][4]).toFixed(2), data: rows.join('\n'), source: 'Binance' });
        }
        return res.json({ symbol: upper, price: parseFloat(d.price).toFixed(2), source: 'Binance' });
      }
    } catch (e) { console.error('Binance Error:', e.message); }
  }

  // ── Everything else via Yahoo Finance (Global Markets) ──────────────────
  const YAHOO_MAP = {
    SENSEX: '^BSESN', NIFTY: '^NSEI', BANKNIFTY: '^NSEBANK',
    SPX: '^GSPC', SP500: '^GSPC', NDX: '^NDX', NASDAQ: '^IXIC', DJI: '^DJI',
    GOLD: 'GC=F', XAUUSD: 'GC=F', SILVER: 'SI=F', DXY: 'DX-Y.NYB'
  };
  
  const yahooSym = YAHOO_MAP[upper] ?? upper;
  try {
    const ytf = { '1m':'1m', '5m':'5m', '15m':'15m', '1H':'1h', '4H':'1h', 'Daily':'1d' }[tf] || '1h';
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${ytf}&range=5d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (r.ok) {
      const d = await r.json();
      const meta = d.chart?.result?.[0]?.meta;
      const yahooResult = d.chart?.result?.[0];
      const yahooPrice = meta?.regularMarketPrice ?? meta?.previousClose;
      const finalPrice = livePrice || parseFloat(yahooPrice).toFixed(2);
      
      if (ohlc && yahooResult) {
        const timestamps = yahooResult.timestamp ?? [];
        const quote = yahooResult.indicators?.quote?.[0] ?? {};
        const rows = [];
        for (let i = timestamps.length - 1; i >= Math.max(0, timestamps.length - 30); i--) {
          if (quote.close?.[i]) {
            rows.push(`${new Date(timestamps[i] * 1000).toISOString()} | O:${parseFloat(quote.open[i]).toFixed(2)} H:${parseFloat(quote.high[i]).toFixed(2)} L:${parseFloat(quote.low[i]).toFixed(2)} C:${parseFloat(quote.close[i]).toFixed(2)}`);
          }
        }
        
        // Inject real-time Groww anchor if available
        let finalData = rows.join('\n');
        if (livePrice) {
          finalData = `⚡ REAL-TIME ANCHOR (Groww): ${livePrice} | O:${liveStats.open} H:${liveStats.high} L:${liveStats.low}\n` + finalData;
        }

        return res.json({ symbol: upper, price: finalPrice, data: finalData, source: livePrice ? 'Groww+Yahoo' : 'Yahoo' });
      }

      if (finalPrice) return res.json({ symbol: upper, price: finalPrice, source: livePrice ? 'Groww' : 'Yahoo' });
    }
  } catch (e) { console.error('Yahoo Error:', e.message); }

  return res.status(404).json({ error: `Price unavailable for ${symbol}` });
}
