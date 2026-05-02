/**
 * AlphaVision Institutional Ticker Resolver
 * Maps common names and variations to exact TradingView/Exchange codes.
 */

const TICKER_MAP = {
  // Indian Stocks (NSE Default)
  'INFOSYS': 'INFY',
  'TATA MOTORS': 'TATAMOTORS',
  'TATA': 'TATAMOTORS',
  'RELIANCE INDUSTRIES': 'RELIANCE',
  'ADANI': 'ADANIENT',
  'ADANI ENTERPRISES': 'ADANIENT',
  'HDFC': 'HDFCBANK',
  'KOTAK': 'KOTAKBANK',
  'BAJAJ': 'BAJFINANCE',
  'ASIAN PAINTS': 'ASIANPAINT',
  'TITAN COMPANY': 'TITAN',
  
  // Commodities
  'CRUDE OIL': 'CRUDEOIL',
  'SILVER': 'SILVER',
  'NATURAL GAS': 'NATGAS',
  
  // Global Indices
  'NASDAQ': 'NDX',
  'DOW': 'US30',
  'DOW JONES': 'US30',
  'S&P 500': 'SPX',
  'SP500': 'SPX'
};

/**
 * Resolves a common name to an institutional ticker.
 * @param {string} input - The raw user input (e.g., 'INFOSYS')
 * @returns {string} - The resolved ticker (e.g., 'INFY')
 */
export function resolveTicker(input) {
  if (!input) return '';
  const upper = input.trim().toUpperCase();
  
  // 1. Direct Map Check
  if (TICKER_MAP[upper]) return TICKER_MAP[upper];
  
  // 2. Partial Match Check (e.g., 'INFOSYS LTD' -> 'INFY')
  for (const [key, value] of Object.entries(TICKER_MAP)) {
    if (upper.includes(key)) return value;
  }
  
  // 3. Default (Return as is)
  return upper;
}
