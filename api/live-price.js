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
  const GROWW_MAP = { NIFTY: 'NIFTY', BANKNIFTY: 'BANKNIFTY' };
  if (GROWW_MAP[upper]) {
    try {
      const r = await fetch(
        `https://groww.in/v1/api/stocks_data/v1/tr_live_indices/exchange/NSE/segment/CASH/${GROWW_MAP[upper]}/latest`
      );
      const d = await r.json();
      const val = parseFloat(d.value ?? d.close);
      return res.json({
        symbol: upper,
        price: isNaN(val) ? '0.00' : val.toFixed(2),
        open:  parseFloat(d.open  ?? d.close).toFixed(2),
        high:  parseFloat(d.high  ?? d.close).toFixed(2),
        low:   parseFloat(d.low   ?? d.close).toFixed(2),
        close: parseFloat(d.close ?? d.value).toFixed(2),
        source: 'Groww',
      });
    } catch (e) { /* fall through */ }
  }

  // ── Crypto via Binance ────────────────────────────────────────────────────
  const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE'];
  const isCrypto = cryptoSymbols.some(s => upper.includes(s)) || upper.endsWith('USDT');
  if (isCrypto) {
    const binSym = upper.endsWith('USDT') ? upper : upper + 'USDT';
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binSym}`);
      const d = await r.json();
      if (d.price && !isNaN(parseFloat(d.price))) {
        return res.json({ symbol: upper, price: parseFloat(d.price).toFixed(2), source: 'Binance' });
      }
    } catch (e) { /* fall through */ }
  }

  // ── Everything else via Yahoo Finance (Global Markets) ──────────────────
  const YAHOO_MAP = {
    // India
    SENSEX: '^BSESN',
    // US Indices
    SPX: '^GSPC', SP500: '^GSPC',
    NDX: '^NDX', NASDAQ: '^IXIC',
    DJI: '^DJI', DOW: '^DJI', US30: '^DJI',
    RUT: '^RUT', RUSSELL: '^RUT',
    VIX: '^VIX',
    // Global Indices
    FTSE: '^FTSE', UK100: '^FTSE',
    DAX: '^GDAXI', GER40: '^GDAXI',
    CAC: '^FCHI', FRA40: '^FCHI',
    N225: '^N225', NIKKEI: '^N225',
    HSI: '^HSI', HANGSENG: '^HSI',
    // Forex & Commodities
    DXY: 'DX-Y.NYB',
    GOLD: 'GC=F', XAUUSD: 'GC=F',
    SILVER: 'SI=F', XAGUSD: 'SI=F',
    OIL: 'CL=F', WTI: 'CL=F', USOIL: 'CL=F',
    NG: 'NG=F', NATGAS: 'NG=F'
  };
  const yahooSym = YAHOO_MAP[upper] ?? upper;
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const d = await r.json();
    const price = d.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price) return res.json({ symbol: upper, price: parseFloat(price).toFixed(2), source: 'Yahoo' });
  } catch (e) { /* fall through */ }

  return res.status(404).json({ error: `No live price available for ${symbol}` });
}
