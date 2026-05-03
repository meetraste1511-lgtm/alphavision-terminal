// BEAST MODE v4.0.0 — Quantum Parallel Liquidity Engine
const PRICE_CACHE = {};
const CACHE_DURATION = 15 * 1000; // 15s for high-speed terminal

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { symbol, exchange, timeframe, ohlc } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const upper = symbol.toUpperCase();
  const upperEx = (exchange || '').toUpperCase();
  const cacheKey = `${upper}_${upperEx}_${timeframe}_${ohlc}`;

  if (PRICE_CACHE[cacheKey] && (Date.now() - PRICE_CACHE[cacheKey].timestamp < CACHE_DURATION)) {
    return res.json({ ...PRICE_CACHE[cacheKey].data, cached: true });
  }

  // --- 🚀 QUANTUM PARALLEL PIPELINE ---
  const fetchers = [];

  // Fetcher 1: Groww (Indian)
  const isIndian = upperEx === 'NSE' || upperEx === 'BSE' || ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'RELIANCE', 'TCS'].some(s => upper.includes(s));
  if (isIndian) {
    const growwMap = { 
      'NIFTY': 'NIFTY', 
      'BANKNIFTY': 'BANKNIFTY', 
      'FINNIFTY': 'FINNIFTY',
      'SENSEX': 'SENSEX'
    };
    const sym = growwMap[upper] || upper;
    fetchers.push((async () => {
      const r = await fetch(`https://groww.in/v1/api/stocks_data/v1/tr_live_indices/exchange/NSE/segment/CASH/${sym}/latest`);
      const d = await r.json();
      const p = parseFloat(d.value ?? d.close);
      if (isNaN(p)) throw 'Invalid';
      return { price: p.toFixed(2), source: '⚡ ULTRA-LOW LATENCY (NSE)' };
    })());
  }

  // Fetcher 2: Binance (Crypto)
  const isCrypto = upperEx === 'BINANCE' || upper.endsWith('USDT') || upper.endsWith('USD') || ['BTC', 'ETH', 'SOL', 'BNB'].includes(upper);
  if (isCrypto) {
    let bSym = upper.replace('USD', 'USDT');
    if (!bSym.endsWith('USDT') && !['BTC', 'ETH', 'SOL', 'BNB'].includes(upper)) bSym += 'USDT';
    else if (['BTC', 'ETH', 'SOL', 'BNB'].includes(upper)) bSym = upper + 'USDT';
    
    fetchers.push((async () => {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${bSym}`);
      const d = await r.json();
      if (!d.price) throw 'Invalid';
      return { price: parseFloat(d.price).toFixed(2), source: '⚡ QUANTUM STREAM (BINANCE)' };
    })());
  }

  // Fetcher 3: Yahoo (Global Fallback)
  const yahooMap = {
    'NIFTY': '^NSEI',
    'BANKNIFTY': '^NSEBANK',
    'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
    'MIDCPNIFTY': 'NIFTY_MIDCAP_100.NS',
    'NIFTYIT': '^CNXIT',
    'SENSEX': '^BSESN',
    'GOLD': 'GC=F',
    'SILVER': 'SI=F',
    'CRUDEOIL': 'CL=F',
    'SPX': '^GSPC',
    'NDX': '^NDX',
    'US30': '^DJI',
    'DAX': '^GDAXI',
    'FTSE': '^FTSE',
  };
  const ySym = yahooMap[upper] || (upperEx === 'NSE' ? upper + '.NS' : upperEx === 'BSE' ? upper + '.BO' : upper);
  fetchers.push((async () => {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1m&range=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const d = await r.json();
    const result = d.chart?.result?.[0];
    const p = result?.meta?.regularMarketPrice;
    if (!p) throw 'Invalid';
    
    let ohlcData = null;
    if (ohlc === 'true') {
      const ts = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      ohlcData = `Historical OHLC for ${upper} | Last Price: ${p}\n---\n` + 
                 ts.slice(-10).map((t, i) => `${new Date(t * 1000).toISOString()} | O:${quote.open?.[i]?.toFixed(2)} H:${quote.high?.[i]?.toFixed(2)} L:${quote.low?.[i]?.toFixed(2)} C:${quote.close?.[i]?.toFixed(2)}`).join('\n');
    }

    return { price: parseFloat(p).toFixed(2), source: '🌍 GLOBAL FEED', ohlcData };
  })());

  try {
    const results = await Promise.allSettled(fetchers);
    const successful = results.find(r => r.status === 'fulfilled')?.value;
    
    if (successful) {
      const responseBody = {
        price: successful.price,
        source: successful.source,
        data: successful.ohlcData || `Current Price: ${successful.price} | Source: ${successful.source}`
      };
      PRICE_CACHE[cacheKey] = { timestamp: Date.now(), data: responseBody };
      return res.json(responseBody);
    }
  } catch (e) {}

  return res.status(500).json({ error: 'Liquidity search failed.' });
}
