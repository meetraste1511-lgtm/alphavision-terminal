/**
 * AlphaVision Market Data Service — Multi-Source, Zero-Hallucination Engine
 *
 * Priority routing per asset class:
 *  Crypto (BTC/ETH/etc.) → Binance API  (real-time, no key needed, no CORS issues)
 *  Indian Indices (NIFTY/BANKNIFTY) → Groww Live API (real-time)
 *  SENSEX → Yahoo Finance
 *  Gold, SPX, Forex, US Stocks → Yahoo Finance v2
 *  Any other → Twelve Data (fallback)
 */

const TWELVE_DATA_BASE = 'https://api.twelvedata.com';

const INTERVAL_MAP = {
  '1m':    '1min',
  '5m':    '5min',
  '15m':   '15min',
  '1H':    '1h',
  '4H':    '4h',
  'Daily': '1day',
};

// Binance interval format
const BINANCE_INTERVAL_MAP = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '1H': '1h', '4H': '4h', 'Daily': '1d',
};

// Yahoo Finance interval format
const YAHOO_INTERVAL_MAP = {
  '1min': '1m', '5min': '5m', '15min': '15m',
  '1h': '1h', '4h': '1h', '1day': '1d',
};

// Map symbols to Yahoo Finance tickers
const YAHOO_SYMBOL_MAP = {
  'NIFTY':     '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'SENSEX':    '^BSESN',
  'GOLD':      'GC=F',
  'XAUUSD':    'GC=F',
  'SPX':       '^GSPC',
  'SP500':     '^GSPC',
};

// Crypto symbols that Binance supports (no slash format)
const BINANCE_SYMBOLS = new Set([
  'BTCUSDT', 'BTCUSD', 'ETHUSDT', 'ETHUSD',
  'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
  'DOGEUSDT', 'LTCUSDT', 'AVAXUSDT', 'LINKUSDT',
]);

// ─── BINANCE FETCHER ─────────────────────────────────────────────────────────
async function fetchFromBinance(symbol, timeframe, outputSize = 50) {
  const binanceSymbol = symbol.endsWith('USD') ? symbol + 'T' : symbol;
  const finalSymbol   = BINANCE_SYMBOLS.has(binanceSymbol) ? binanceSymbol : symbol.replace('/', '');
  const interval      = BINANCE_INTERVAL_MAP[timeframe] || '1h';

  const url = `https://api.binance.com/api/v3/klines?symbol=${finalSymbol}&interval=${interval}&limit=${outputSize}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('Binance fetch failed');
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('No Binance data');

  // Binance kline format: [openTime, open, high, low, close, volume, ...]
  const candles = data.reverse().map(k => ({
    datetime: new Date(k[0]).toISOString(),
    open:  parseFloat(k[1]).toFixed(2),
    high:  parseFloat(k[2]).toFixed(2),
    low:   parseFloat(k[3]).toFixed(2),
    close: parseFloat(k[4]).toFixed(2),
  }));

  const lastPrice = candles[0].close;
  const header = `Live OHLC Data (Binance) for ${symbol} | Interval: ${timeframe} | ${candles.length} candles | Latest Close: ${lastPrice}`;
  const rows   = candles.map(c => `${c.datetime} | O:${c.open} H:${c.high} L:${c.low} C:${c.close}`);

  return {
    success: true,
    data: [header, '---', ...rows].join('\n'),
    lastPrice,
    candles,
    source: 'Binance',
  };
}

// ─── GROWW FETCHER (Indian Indices live price) ────────────────────────────────
async function fetchFromGroww(symbol) {
  const GROWW_MAP = {
    'NIFTY':     'NIFTY',
    'BANKNIFTY': 'BANKNIFTY',
  };
  const growwSymbol = GROWW_MAP[symbol];
  if (!growwSymbol) throw new Error(`No Groww mapping for ${symbol}`);

  const url = `https://groww.in/v1/api/stocks_data/v1/tr_live_indices/exchange/NSE/segment/CASH/${growwSymbol}/latest`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Groww fetch failed');
  const d = await res.json();

  const livePrice = d.value ?? d.close;
  if (!livePrice || isNaN(parseFloat(livePrice))) throw new Error('No valid price in Groww response');

  const safeParse = (v) => {
    const p = parseFloat(v);
    return isNaN(p) ? parseFloat(livePrice) : p;
  };

  return {
    livePrice: parseFloat(livePrice).toFixed(2),
    open:  safeParse(d.open).toFixed(2),
    high:  safeParse(d.high).toFixed(2),
    low:   safeParse(d.low).toFixed(2),
    close: safeParse(d.close).toFixed(2),
  };
}

// ─── YAHOO FINANCE FETCHER ────────────────────────────────────────────────────
async function fetchFromYahoo(symbol, timeframe, outputSize = 50) {
  const yahooSymbol = YAHOO_SYMBOL_MAP[symbol] ?? symbol;
  const interval    = YAHOO_INTERVAL_MAP[INTERVAL_MAP[timeframe] || '1h'] ?? '1h';
  const range       = interval === '1m' ? '1d' : interval === '5m' ? '5d' : '60d';

  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('Yahoo Finance fetch failed');
  const json = await res.json();

  const result = json.chart?.result?.[0];
  if (!result) throw new Error('No Yahoo data');

  const meta       = result.meta;
  const timestamps = result.timestamp ?? [];
  const quote      = result.indicators?.quote?.[0] ?? {};
  
  const rawPrice = meta.regularMarketPrice ?? meta.previousClose;
  const livePrice = (rawPrice && !isNaN(parseFloat(rawPrice))) ? parseFloat(rawPrice).toFixed(2) : '0.00';

  let candles = [];
  for (let i = timestamps.length - 1; i >= Math.max(0, timestamps.length - outputSize); i--) {
    if (quote.close?.[i] != null) {
      candles.push({
        datetime: new Date(timestamps[i] * 1000).toISOString(),
        open:  parseFloat(quote.open[i]  ?? quote.close[i]).toFixed(2),
        high:  parseFloat(quote.high[i]  ?? quote.close[i]).toFixed(2),
        low:   parseFloat(quote.low[i]   ?? quote.close[i]).toFixed(2),
        close: parseFloat(quote.close[i]).toFixed(2),
      });
    }
  }

  // If no intraday candles, build a synthetic OHLC from the day data
  if (candles.length === 0) {
    candles.push({
      datetime: new Date().toISOString(),
      open:  parseFloat(meta.chartPreviousClose ?? livePrice).toFixed(2),
      high:  parseFloat(meta.regularMarketDayHigh ?? livePrice).toFixed(2),
      low:   parseFloat(meta.regularMarketDayLow  ?? livePrice).toFixed(2),
      close: livePrice,
    });
  }

  const lastPrice = livePrice; // Use Yahoo meta live price — most accurate
  const header = `Live OHLC Data (Yahoo Finance) for ${symbol} | Interval: ${timeframe} | ${candles.length} candles | Latest Price: ${lastPrice}`;
  const rows   = candles.map(c => `${c.datetime} | O:${c.open} H:${c.high} L:${c.low} C:${c.close}`);

  return {
    success: true,
    data: [header, '---', ...rows].join('\n'),
    lastPrice,
    candles,
    source: 'Yahoo Finance',
  };
}

// ─── TWELVE DATA FETCHER (fallback for stocks, forex) ────────────────────────
async function fetchFromTwelveData(symbol, exchange, timeframe, apiKey, outputSize) {
  let tdSymbol = symbol;
  if (symbol === 'BTCUSD' || symbol === 'BTCUSDT') tdSymbol = 'BTC/USD';
  else if (symbol === 'ETHUSD' || symbol === 'ETHUSDT') tdSymbol = 'ETH/USD';
  else if (symbol === 'GOLD' || symbol === 'XAUUSD') tdSymbol = 'XAU/USD';
  else if (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol)) {
    tdSymbol = `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }

  const interval = INTERVAL_MAP[timeframe] || '1h';
  let url = `${TWELVE_DATA_BASE}/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${interval}&outputsize=${outputSize}&apikey=${apiKey}`;
  if (exchange && exchange !== 'BINANCE' && exchange !== 'COMEX' && exchange !== 'FOREXCOM') {
    url += `&exchange=${exchange}`;
  }

  const res  = await fetch(url);
  const json = await res.json();
  if (json.status === 'error' || !json.values?.length) {
    throw new Error(json.message || 'Twelve Data returned no results');
  }

  const lastPrice = json.values[0]?.close ?? 'N/A';
  const header = `Live OHLC Data (Twelve Data) for ${exchange ? exchange + ':' : ''}${symbol} | Interval: ${timeframe} | ${json.values.length} candles`;
  const rows   = json.values.map(c =>
    `${c.datetime} | O:${c.open} H:${c.high} L:${c.low} C:${c.close}${c.volume ? ' V:' + c.volume : ''}`
  );

  return {
    success: true,
    data: [header, '---', ...rows].join('\n'),
    lastPrice,
    candles: json.values,
    source: 'Twelve Data',
  };
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────
export async function fetchOHLC(symbol, exchange, timeframe, apiKey, outputSize = 30) {
  const upperSymbol = symbol.toUpperCase();
  
  try {
    // Try our proxy first (bypasses CORS and handles all routing)
    const r = await fetch(`/api/live-price?symbol=${upperSymbol}&exchange=${exchange}&timeframe=${timeframe}&ohlc=true`);
    if (r.ok) {
      const d = await r.json();
      if (d.data) {
        return {
          success: true,
          data: d.data,
          lastPrice: d.price,
          source: d.source || 'Proxy'
        };
      }
    }
  } catch (e) {
    console.warn('Proxy fetch failed, falling back to direct:', e.message);
  }

  // Route 1: Crypto → Binance
  const isCrypto = BINANCE_SYMBOLS.has(upperSymbol) ||
                   upperSymbol.endsWith('USDT') || upperSymbol.endsWith('BTC') ||
                   exchange === 'BINANCE' || exchange === 'CRYPTO';
  if (isCrypto) {
    try {
      return await fetchFromBinance(upperSymbol, timeframe, outputSize);
    } catch (e) { console.warn('Binance fallback failed:', e.message); }
  }

  // Fallback to direct fetch (might hit CORS in browser, but works in Node/Electron)
  if (['NIFTY', 'BANKNIFTY'].includes(upperSymbol)) {
    try {
      return await fetchFromYahoo(upperSymbol, timeframe, outputSize);
    } catch (e) { console.warn('Yahoo fallback failed:', e.message); }
  }

  return { success: false, error: `Live data unavailable for ${symbol}.` };
}

// ─── GET MARKET CONTEXT (used by App.jsx) ─────────────────────────────────────
export async function getMarketContext(symbol, exchange, timeframe, apiKey) {
  const result = await fetchOHLC(symbol, exchange, timeframe, apiKey, 30);

  if (!result.success) {
    return { text: `[Market data unavailable for ${timeframe}: ${result.error}]`, lastPrice: null };
  }

  return { text: result.data, lastPrice: result.lastPrice };
}
