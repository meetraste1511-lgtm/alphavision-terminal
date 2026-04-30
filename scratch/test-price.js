
async function test() {
  const symbol = 'BTCUSDT';
  const upper = symbol.toUpperCase();
  const GROWW_MAP = { NIFTY: 'NIFTY', BANKNIFTY: 'BANKNIFTY', FINNIFTY: 'FINNIFTY' };
  
  console.log('upper:', upper);
  console.log('GROWW_MAP[upper]:', GROWW_MAP[upper]);

  const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK', 'DOT'];
  const isCrypto = cryptoSymbols.some(s => upper.includes(s)) || upper.endsWith('USDT') || upper.endsWith('BTC');
  console.log('isCrypto:', isCrypto);

  if (isCrypto) {
    let binSym = upper;
    const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binSym}`);
    if (r.ok) {
      const d = await r.json();
      console.log('Binance result:', d);
    } else {
      console.log('Binance failed');
    }
  }
}

test();
