// api/live-price.js — Vercel Serverless Function
// Fetches live market prices server-side (no CORS restrictions)
// Called by the React app as: GET /api/live-price?symbol=NIFTY

export default async function handler(req, res) {
  // Allow CORS from our own frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });

  const upper = symbol.toUpperCase();

  // ── Indian Indices via Groww ───────────────────────────────────────────────
  const GROWW_MAP = { NIFTY: 'NIFTY', BANKNIFTY: 'BANKNIFTY', FINNIFTY: 'FINNIFTY' };
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
          return res.json({
            symbol: upper,
            price: val.toFixed(2),
            open:  parseFloat(d.open  ?? rawVal).toFixed(2),
            high:  parseFloat(d.high  ?? rawVal).toFixed(2),
            low:   parseFloat(d.low   ?? rawVal).toFixed(2),
            close: parseFloat(d.close ?? rawVal).toFixed(2),
            source: 'Groww',
          });
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
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binSym}`);
      if (r.ok) {
        const d = await r.json();
        const val = parseFloat(d.price);
        if (!isNaN(val)) {
          return res.json({ symbol: upper, price: val.toFixed(2), source: 'Binance' });
        }
      }
    } catch (e) { console.error('Binance Error:', e.message); }
  }

  // ── Everything else via Yahoo Finance (Global Markets) ──────────────────
  const YAHOO_MAP = {
    // India
    SENSEX: '^BSESN',
    NIFTY: '^NSEI',
    BANKNIFTY: '^NSEBANK',
    // US Indices
    SPX: '^GSPC', SP500: '^GSPC',
    NDX: '^NDX', NASDAQ: '^IXIC',
    DJI: '^DJI', DOW: '^DJI', US30: '^DJI',
    RUT: '^RUT', RUSSELL: '^RUT',
    // Commodities & Forex
    GOLD: 'GC=F', XAUUSD: 'GC=F',
    SILVER: 'SI=F', XAGUSD: 'SI=F',
    OIL: 'CL=F', WTI: 'CL=F',
    DXY: 'DX-Y.NYB'
  };
  
  const yahooSym = YAHOO_MAP[upper] ?? upper;
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (r.ok) {
      const d = await r.json();
      const meta = d.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice ?? meta?.previousClose;
      if (price && !isNaN(parseFloat(price))) {
        return res.json({ 
          symbol: upper, 
          price: parseFloat(price).toFixed(2), 
          source: 'Yahoo' 
        });
      }
    }
  } catch (e) { console.error('Yahoo Error:', e.message); }

  return res.status(404).json({ error: `Live price currently unavailable for ${symbol}. Please use Manual Price override.` });
}
}
