import { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Activity, Target, ShieldAlert, TrendingUp, Settings, Sun, Moon, AlertOctagon, Clock, DollarSign, BarChart3, CheckCircle, XCircle, RotateCcw, Zap } from 'lucide-react';
import { getMarketContext } from './services/marketData';
import { analyzeWithProvider } from './services/aiProviders';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Paywall from './components/Paywall';
import './App.css';
import './mobile.css';

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', 'Daily'];

const EXCHANGES = [
  { value: '', label: 'Auto' },
  { value: 'NSE', label: 'NSE (India)' },
  { value: 'BSE', label: 'BSE (India)' },
  { value: 'BINANCE', label: 'Binance' },
  { value: 'NASDAQ', label: 'NASDAQ' },
  { value: 'NYSE', label: 'NYSE' },
  { value: 'COMEX', label: 'COMEX' },
  { value: 'FOREXCOM', label: 'Forex' },
];

const QUICK_PICKS = [
  { label: 'NIFTY', symbol: 'NIFTY', exchange: 'NSE' },
  { label: 'BANKNIFTY', symbol: 'BANKNIFTY', exchange: 'NSE' },
  { label: 'BTC', symbol: 'BTCUSDT', exchange: 'BINANCE' },
  { label: 'GOLD', symbol: 'GOLD', exchange: 'COMEX' },
  { label: 'NDX (Nasdaq)', symbol: 'NDX', exchange: 'NASDAQ' },
  { label: 'US30 (Dow)', symbol: 'US30', exchange: 'NYSE' },
];

function App() {
  const [inputMode, setInputMode] = useState('direct');
  const [directAsset, setDirectAsset] = useState('NIFTY');
  const [exchange, setExchange] = useState('NSE');
  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [riskPercent, setRiskPercent] = useState(localStorage.getItem('av_risk_pct') || '1');
  const [tradeType, setTradeType] = useState('long');
  const [tradeStyle, setTradeStyle] = useState('scalp');
  const [capital, setCapital] = useState(localStorage.getItem('av_capital') || '100000');
  const [manualPrice, setManualPrice] = useState('');
  
  // Account stats persisted in localStorage
  const loadStats = () => {
    try { return JSON.parse(localStorage.getItem('av_stats')) || { wins: 0, losses: 0, pnl: 0, trades: [] }; }
    catch { return { wins: 0, losses: 0, pnl: 0, trades: [] }; }
  };
  const [accountStats, setAccountStats] = useState(loadStats);
  
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [apiKeys, setApiKeys] = useState({
    gemini: localStorage.getItem('av_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || '',
    groq: localStorage.getItem('av_groq_key') || import.meta.env.VITE_GROQ_API_KEY || '',
    openrouter: localStorage.getItem('av_openrouter_key') || import.meta.env.VITE_OPENROUTER_API_KEY || '',
    twelvedata: localStorage.getItem('av_twelvedata_key') || import.meta.env.VITE_TWELVEDATA_API_KEY || ''
  });
  
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('av_ai_provider') || 'gemini');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showSettings, setShowSettings] = useState(false);
  const [session, setSession] = useState(null);
  const [hasAccess, setHasAccess] = useState(true);
  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

  const checkAccess = async (user) => {
    if (!user) return;
    // Admin always gets full access — no paywall
    if (user.email === ADMIN_EMAIL) {
      setHasAccess(true);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_expiry_date')
        .eq('id', user.id)
        .single();
      
      // If the table doesn't exist yet or no row found, deny access
      if (error || !data || !data.subscription_expiry_date) {
        setHasAccess(false);
        return;
      }
      
      const expiry = new Date(data.subscription_expiry_date);
      setHasAccess(expiry > new Date());
    } catch (err) {
      console.error('Error checking access:', err);
      setHasAccess(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkAccess(session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkAccess(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [livePrice, setLivePrice] = useState(null);
  const [livePriceSource, setLivePriceSource] = useState('');
  const [livePriceFetching, setLivePriceFetching] = useState(false);
  
  const fileInputRef = useRef(null);
  const retryCount = useRef(0);

  // Auto-fetch live price whenever ticker changes
  useEffect(() => {
    if (inputMode !== 'direct' || !directAsset.trim()) return;
    let cancelled = false;
    setLivePrice(null);
    setLivePriceFetching(true);

    const fetchPrice = async () => {
      try {
        const r = await fetch(`/api/live-price?symbol=${directAsset}`);
        if (r.ok) {
          const d = await r.json();
          if (!cancelled && d.price) { 
            setLivePrice(d.price); 
            setLivePriceSource(d.source || 'Verified Source');
            return; 
          }
        }
      } catch { /* ignore */ }

      try {
        const ctx = await getMarketContext(directAsset, exchange, activeTimeframe, apiKeys.twelvedata);
        if (!cancelled && ctx.lastPrice) {
          setLivePrice(ctx.lastPrice);
          setLivePriceSource('TwelveData');
        }
      } catch { /* ignore */ }
    };

    fetchPrice().finally(() => { if (!cancelled) setLivePriceFetching(false); });
    return () => { cancelled = true; };
  }, [directAsset, exchange]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) { setError('Please upload a valid image file.'); return; }
    setError('');
    setImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };
  const removeImage = () => { setImage(null); setImageBase64(''); setResults(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const analyzeChart = async () => {
    if (inputMode === 'image' && !imageBase64) { setError('Upload a chart image first.'); return; }
    if (inputMode === 'direct' && !directAsset.trim()) { setError('Enter a valid ticker/asset name.'); return; }
    
    // Validate keys before starting
    if (aiProvider !== 'pollinations' && !apiKeys[aiProvider]) { 
      setShowSettings(true); 
      setError(`Please enter your ${aiProvider.toUpperCase()} API key in settings.`); 
      return; 
    }

    if (inputMode === 'direct' && aiProvider !== 'gemini' && !apiKeys.twelvedata) {
      setShowSettings(true);
      setError('Twelve Data API Key is required for live market data when using Groq/OpenRouter.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setResults(null);

    try {
      const fullSymbol = exchange ? `${exchange}:${directAsset}` : directAsset;
      const assetName = inputMode === 'direct' ? fullSymbol : 'the asset shown in this chart';
      
      let marketDataText = '';
      let currentPrice = null;
      if (inputMode === 'direct') {
        // Fetch real market data for the active timeframe (as a baseline)
        const marketCtx = await getMarketContext(directAsset, exchange, activeTimeframe, apiKeys.twelvedata);
        marketDataText = marketCtx.text;
        currentPrice = marketCtx.lastPrice;
      }

      const config = {
        tradeType,
        tradeStyle,
        assetName,
        riskPercent,
        marketDataText,
        currentPrice: manualPrice ? parseFloat(manualPrice) : (currentPrice || null),
        imageBase64,
        isImageMode: inputMode === 'image'
      };

      const parsed = await analyzeWithProvider(aiProvider, apiKeys, config);
      
      setResults(parsed);
      retryCount.current = 0;
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      // Detect quota / rate-limit errors
      if ((msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate') || msg.includes('429')) && retryCount.current < 1) {
        retryCount.current += 1;
        const retryMatch = msg.match(/retry in (\d+(\.\d+)?)/i);
        const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 3 : 20;
        setError(`⏳ Rate limit hit. Retrying automatically in ${waitSec}s...`);
        setIsAnalyzing(false);
        setTimeout(() => {
          setError('');
          analyzeChart();
        }, waitSec * 1000);
        return;
      } else if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate') || msg.includes('429')) {
        retryCount.current = 0;
        setError(`⚠️ API quota exceeded for ${aiProvider.toUpperCase()}. Please wait 1-2 minutes or switch providers in Settings.`);
      } else {
        setError(`Analysis Error: ${msg}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Attempt to catch undocumented TradingView internal symbol changes via postMessage
  useEffect(() => {
    const handleMessage = (event) => {
      // Security: verify origin if needed, but we accept from tradingview
      if (event.origin !== 'https://s.tradingview.com') return;
      
      try {
        let data = event.data;
        if (typeof data === 'string') data = JSON.parse(data);
        
        // TradingView internal events often have a 'name' and 'data' structure
        if (data && data.name === 'widgetReady') {
           // Widget loaded
        }
        
        // Look for symbol change payloads (undocumented format)
        if (data && data.name === 'symbol-change' && data.data) {
           const fullSymbol = typeof data.data === 'string' ? data.data : data.data.symbol;
           if (fullSymbol) {
             const parts = fullSymbol.split(':');
             if (parts.length > 1) {
               setExchange(parts[0]);
               setDirectAsset(parts[1]);
             } else {
               setExchange('');
               setDirectAsset(fullSymbol);
             }
           }
        }
      } catch (e) {
        // Ignore parse errors from other extensions/iframes
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getTvInterval = () => {
    switch(activeTimeframe) {
      case '1m': return '1';
      case '5m': return '5';
      case '15m': return '15';
      case '1H': return '60';
      case '4H': return '240';
      case 'Daily': return 'D';
      default: return '60';
    }
  };

  const getTvSymbol = () => {
    if (exchange) return `${exchange}:${directAsset}`;
    return directAsset;
  };

  const activeResult = results?.timeframes?.[activeTimeframe];

  // Capital & Risk calculations
  const cap = parseFloat(capital) || 0;
  const riskPct = parseFloat(riskPercent) || 1;
  const riskAmount = cap * (riskPct / 100);
  const entry = activeResult ? parseFloat(String(activeResult.entry).replace(/[^0-9.]/g, '')) : 0;
  const sl = activeResult ? parseFloat(String(activeResult.stopLoss).replace(/[^0-9.]/g, '')) : 0;
  const tp = activeResult ? parseFloat(String(activeResult.takeProfit).replace(/[^0-9.]/g, '')) : 0;
  const slDistance = entry && sl ? Math.abs(entry - sl) : 0;
  const tpDistance = entry && tp ? Math.abs(tp - entry) : 0;
  
  // Hardcode explicit, mathematically perfect R:R
  const calculatedRR = slDistance > 0 && tpDistance > 0 ? (tpDistance / slDistance).toFixed(2) : 0;
  const displayRR = calculatedRR > 0 ? `1:${calculatedRR}` : (activeResult?.riskReward || '—');

  // Calculate precise position size (allowing decimals for crypto)
  const rawPositionSize = slDistance > 0 ? (riskAmount / slDistance) : 0;
  const positionSize = rawPositionSize > 100 ? Math.floor(rawPositionSize) : Number(rawPositionSize.toFixed(4));
  
  const potentialProfit = positionSize * tpDistance;
  const potentialLoss = riskAmount;
  const winRate = accountStats.wins + accountStats.losses > 0 ? ((accountStats.wins / (accountStats.wins + accountStats.losses)) * 100).toFixed(1) : '—';

  const saveStats = (newStats) => {
    setAccountStats(newStats);
    localStorage.setItem('av_stats', JSON.stringify(newStats));
  };

  const logTrade = (won) => {
    if (!activeResult) return;
    const profit = won ? potentialProfit : -potentialLoss;
    const newStats = {
      wins: accountStats.wins + (won ? 1 : 0),
      losses: accountStats.losses + (won ? 0 : 1),
      pnl: accountStats.pnl + profit,
      trades: [...(accountStats.trades || []), { date: new Date().toISOString(), asset: directAsset, tf: activeTimeframe, won, amount: profit }].slice(-50)
    };
    saveStats(newStats);
  };

  const resetStats = () => saveStats({ wins: 0, losses: 0, pnl: 0, trades: [] });
  
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  if (!session) {
    return <Auth onLogin={setSession} />;
  }

  if (!hasAccess && session?.user?.email !== ADMIN_EMAIL) {
    return <Paywall userEmail={session.user.email} />;
  }

  return (
    <div className="app-container" data-theme={theme}>
      {/* Top Navigation Bar */}
      <header className="header">
        <div className="header-left">
          <Activity color="var(--accent-color)" size={22} />
          <h1>AlphaVision Terminal</h1>
          <div className="header-separator"></div>
          <div className="mode-toggle" style={{ margin: 0 }}>
            <button className={inputMode === 'direct' ? 'active' : ''} onClick={() => setInputMode('direct')}>Live Chart</button>
            <button className={inputMode === 'image' ? 'active' : ''} onClick={() => setInputMode('image')}>Image Upload</button>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={20} />
          </button>
          <button className="icon-btn" onClick={() => supabase.auth.signOut()} title="Sign Out">
            <XCircle size={20} />
          </button>
        </div>
      </header>

      {/* Main Terminal Layout */}
      <main className="main-content">
        
        {/* Left Sidebar: Order Entry */}
        <aside className="sidebar-panel">
          <div className="sidebar-content">
            
            <div className="sidebar-section">
              <div className="section-title">Order Entry</div>
              
              {inputMode === 'direct' && (
                <>
                <div className="form-group">
                  <label>Exchange</label>
                  <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
                    {EXCHANGES.map(ex => <option key={ex.value} value={ex.value}>{ex.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Ticker Symbol</label>
                  <input type="text" placeholder="e.g. NIFTY, BANKNIFTY, AAPL" value={directAsset} onChange={(e) => setDirectAsset(e.target.value.toUpperCase())} />
                </div>
                <div className="quick-picks">
                  {QUICK_PICKS.map(qp => (
                    <button key={qp.label} className={`qp-btn ${directAsset === qp.symbol && exchange === qp.exchange ? 'active' : ''}`}
                      onClick={() => { setDirectAsset(qp.symbol); setExchange(qp.exchange); }}>
                      {qp.label}
                    </button>
                  ))}
                </div>
                </>
              )}
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Side</label>
                  <select value={tradeType} onChange={(e) => setTradeType(e.target.value)}>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Style</label>
                  <select value={tradeStyle} onChange={(e) => setTradeStyle(e.target.value)}>
                    <option value="scalp">Scalp (Quick)</option>
                    <option value="swing">Swing (Hold)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Risk %</label>
                  <input type="number" min="0.1" step="0.1" max="100" value={riskPercent} onChange={(e) => { setRiskPercent(e.target.value); localStorage.setItem('av_risk_pct', e.target.value); }} />
                </div>
              </div>

              <div className="form-group">
                <label>Base Capital</label>
                <input type="number" min="0" step="1000" value={capital} onChange={(e) => { setCapital(e.target.value); localStorage.setItem('av_capital', e.target.value); }} placeholder="e.g. 100000" />
              </div>

              <div className="form-group">
                <label>Live Price Override (Optional)</label>
                <input type="number" step="0.01" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} placeholder="Type current price if API fails..." />
              </div>

              {/* Live Price Badge — auto-fetched from Binance / Groww / Yahoo */}
              {inputMode === 'direct' && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: '8px', marginBottom: '8px',
                  background: livePrice ? 'rgba(14, 203, 129, 0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${livePrice ? 'rgba(14,203,129,0.3)' : 'var(--surface-border)'}`,
                  transition: 'all 0.3s ease',
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    ⚡ LIVE PRICE {livePriceSource ? `• Data by ${livePriceSource}` : ''}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success-color)', fontFamily: 'monospace' }}>
                    {livePriceFetching ? '⏳ Fetching...' : livePrice ? livePrice : '— Not Available'}
                  </span>
                </div>
              )}

              <button className="btn-primary" onClick={analyzeChart} disabled={isAnalyzing || (inputMode === 'image' && !image)}>
                <Zap size={14} style={{ marginRight: '6px' }} />
                {isAnalyzing ? 'Scanning All Timeframes...' : `Analyze with ${aiProvider.toUpperCase()}`}
              </button>
              
              {error && <div className="error-msg">{error}</div>}
            </div>

            {/* Legal Trust Shield Footer */}
            <div style={{ padding: '16px 20px', marginTop: 'auto', borderTop: '1px solid var(--surface-border)', fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: '1.4', textAlign: 'center' }}>
              <ShieldAlert size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: 'var(--text-secondary)' }} />
              <strong>AlphaVision Core</strong> is a quantitative analysis tool. All outputs are for educational paper-trading simulation only. Not SEBI registered financial advice.
            </div>

            {/* Timeframe Tabs */}
            {(isAnalyzing || results) && (
              <div className="sidebar-section">
                <div className="section-title">
                  <Clock size={14} />
                  Timeframe Analysis
                </div>
                
                <div className="tf-tabs">
                  {TIMEFRAMES.map(tf => {
                    const tfResult = results?.timeframes?.[tf];
                    const conf = tfResult?.confidence;
                    return (
                      <button 
                        key={tf} 
                        className={`tf-tab ${activeTimeframe === tf ? 'active' : ''}`}
                        onClick={() => setActiveTimeframe(tf)}
                      >
                        <span className="tf-tab-label">{tf}</span>
                        {conf !== undefined && (
                          <span className={`tf-tab-conf ${conf >= 75 ? 'high' : conf >= 50 ? 'mid' : 'low'}`}>{conf}%</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Panel: Results & Setup */}
        <div className="results-panel" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          
          {/* Professional Empty State / System Dashboard */}
          {!isAnalyzing && !results && inputMode === 'direct' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <Activity size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
              <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>AlphaVision Terminal Ready</h2>
              <p style={{ fontSize: '0.9rem', marginBottom: '32px', textAlign: 'center', maxWidth: '400px', lineHeight: '1.5' }}>
                Institutional grade quantitative analysis engine. Select an asset on the left to begin multi-timeframe market scanning.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '500px' }}>
                <div style={{ background: 'var(--surface-color)', padding: '16px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-color)', boxShadow: '0 0 8px var(--success-color)' }}></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>AI Engine Status</span>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>Engine Online & Synchronized</div>
                </div>
                
                <div style={{ background: 'var(--surface-color)', padding: '16px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-color)', boxShadow: '0 0 8px var(--success-color)' }}></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>Data Feeds</span>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>Connected to {livePriceSource || 'Global Markets'}</div>
                </div>
                
                <div style={{ background: 'var(--surface-color)', padding: '16px', borderRadius: '8px', border: '1px solid var(--surface-border)', gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)', display: 'block', marginBottom: '12px' }}>Confidence Key</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--success-color)' }}></div> &gt; 75% (Prime)</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--warning-color)' }}></div> 50-74% (Watchlist)</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--danger-color)' }}></div> &lt; 50% (No Trade)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isAnalyzing && !results && inputMode === 'image' && (
            <div 
              className={`upload-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!image ? (
                <>
                  <UploadCloud size={48} color="var(--accent-color)" style={{ marginBottom: '16px' }} />
                  <h3>Upload TradingView Chart</h3>
                  <p>Drag and drop or click to browse</p>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                  <button className="btn-secondary" style={{ marginTop: '16px' }} onClick={() => fileInputRef.current?.click()}>
                    Browse Files
                  </button>
                </>
              ) : (
                <div className="image-preview">
                  <img src={image} alt="Chart to analyze" />
                  <button className="icon-btn remove-btn" onClick={removeImage}><X size={20} /></button>
                </div>
              )}
            </div>
          )}

          {isAnalyzing ? (
            <div className="loader" style={{ padding: '30px 0' }}>
              <div className="spinner"></div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scraping live data for all timeframes...</span>
            </div>
          ) : activeResult ? (
                  <div className="tf-result-panel">
                    {/* Confidence Bar */}
                    <div className="confidence-container">
                      <div className="confidence-header">
                        <span>Confidence ({activeTimeframe})</span>
                        <span style={{ color: activeResult.confidence >= 75 ? 'var(--success-color)' : activeResult.confidence >= 50 ? 'var(--warning-color)' : 'var(--danger-color)' }}>
                          {activeResult.confidence}%
                        </span>
                      </div>
                      <div className="confidence-track">
                        <div className="confidence-fill" style={{ 
                          width: `${activeResult.confidence}%`,
                          background: activeResult.confidence >= 75 ? 'var(--success-color)' : activeResult.confidence >= 50 ? 'var(--warning-color)' : 'var(--danger-color)'
                        }}></div>
                      </div>
                    </div>

                    {activeResult.confidence < 75 && (
                      <div className="warning-banner">
                        <AlertOctagon size={14} />
                        Low probability on {activeTimeframe}. Skip this timeframe.
                      </div>
                    )}

                    {/* Price Levels */}
                    <div className="levels-grid">
                      <div className="level-card entry">
                        <span className="level-label">Entry</span>
                        <span className="level-value">{activeResult.entry}</span>
                      </div>
                      <div className="level-card tp">
                        <span className="level-label">Take Profit</span>
                        <span className="level-value">{activeResult.takeProfit}</span>
                      </div>
                      <div className="level-card sl">
                        <span className="level-label">Stop Loss</span>
                        <span className="level-value">{activeResult.stopLoss}</span>
                      </div>
                      <div className="level-card rr">
                        <span className="level-label">R:R</span>
                        <span className="level-value" style={{ color: calculatedRR < 2 ? 'var(--danger-color)' : 'var(--success-color)' }}>{displayRR}</span>
                      </div>
                    </div>

                    {/* Estimated Time */}
                    {activeResult.estimatedTime && (
                      <div className="estimated-time" style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', borderLeft: '3px solid var(--accent-color)', fontSize: '0.9rem' }}>
                        <strong>⏱ Estimated Entry Time:</strong> {activeResult.estimatedTime}
                      </div>
                    )}

                    {/* Risk Calculator / Warning Block */}
                    {calculatedRR < 2 ? (
                      <div className="risk-warning-block" style={{ marginTop: '20px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', borderRadius: '8px', textAlign: 'center' }}>
                        <AlertOctagon size={24} color="var(--danger-color)" style={{ marginBottom: '8px' }} />
                        <h4 style={{ color: 'var(--danger-color)', marginBottom: '4px', fontSize: '1.1rem', fontWeight: 600 }}>🚨 NOT A TRADE ZONE</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Risk/Reward is below 1:2 ({displayRR}). Give the market time to come to your level at approx <strong>{activeResult.estimatedTime || 'later'}</strong>.
                        </p>
                      </div>
                    ) : (
                      entry > 0 && cap > 0 && (
                        <div className="risk-calc-panel">
                          <div className="section-title"><DollarSign size={14} /> Risk Calculator</div>
                          <div className="risk-grid">
                            <div className="risk-item">
                              <span className="risk-item-label">Risk Amount</span>
                              <span className="risk-item-value danger">₹{riskAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="risk-item">
                              <span className="risk-item-label">Position Size</span>
                              <span className="risk-item-value">{positionSize} qty</span>
                            </div>
                            <div className="risk-item">
                              <span className="risk-item-label">Target Profit</span>
                              <span className="risk-item-value success">₹{potentialProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="risk-item">
                              <span className="risk-item-label">Max Loss</span>
                              <span className="risk-item-value danger">₹{potentialLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                          <div className="trade-log-btns">
                            <button className="log-btn win" onClick={() => logTrade(true)}><CheckCircle size={14} /> Log Win</button>
                            <button className="log-btn lose" onClick={() => logTrade(false)}><XCircle size={14} /> Log Loss</button>
                          </div>
                        </div>
                      )
                    )}

                    {/* Analysis */}
                    <div className="analysis-block">
                      <h4>Analysis — {activeTimeframe}</h4>
                      <p>{activeResult.analysis}</p>
                    </div>

                    {/* Shared Macro Context */}
                    {results?.liveContext && (
                      <div className="analysis-block macro">
                        <h4>Live Macro Context</h4>
                        <p>{results.liveContext}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Account Stats */}
            <div className="sidebar-section">
              <div className="section-title" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart3 size={14} /> Account Stats</span>
                <button className="icon-btn" onClick={resetStats} title="Reset Stats" style={{ padding: '2px' }}><RotateCcw size={12} /></button>
              </div>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Capital</span>
                  <span className="stat-value">₹{cap.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Win Rate</span>
                  <span className="stat-value" style={{ color: winRate !== '—' && parseFloat(winRate) >= 50 ? 'var(--success-color)' : 'var(--danger-color)' }}>{winRate}{winRate !== '—' ? '%' : ''}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Wins</span>
                  <span className="stat-value" style={{ color: 'var(--success-color)' }}>{accountStats.wins}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Losses</span>
                  <span className="stat-value" style={{ color: 'var(--danger-color)' }}>{accountStats.losses}</span>
                </div>
                <div className="stat-item" style={{ gridColumn: 'span 2' }}>
                  <span className="stat-label">Total P&L</span>
                  <span className="stat-value" style={{ color: accountStats.pnl >= 0 ? 'var(--success-color)' : 'var(--danger-color)', fontSize: '1.1rem' }}>
                    {accountStats.pnl >= 0 ? '+' : ''}₹{accountStats.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side: Chart / Upload */}
        <section className="workspace-panel">
          {inputMode === 'direct' ? (
            <div className="tv-widget-container">
              <iframe 
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(getTvSymbol())}&interval=${getTvInterval()}&theme=${theme === 'dark' ? 'dark' : 'light'}&style=1&timezone=Asia%2FKolkata&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=1`}
                width="100%" height="100%" frameBorder="0" allowFullScreen title="Live Chart"
              ></iframe>
            </div>
          ) : (
            <div style={{ padding: '40px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {!image ? (
                <div className={`upload-zone ${isDragging ? 'drag-active' : ''}`}
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                  <UploadCloud size={48} color="var(--accent-color)" style={{ margin: '0 auto 16px auto' }} />
                  <h3>Drop Chart Image Here</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>PNG, JPG from any platform</p>
                </div>
              ) : (
                <div style={{ flex: 1, position: 'relative' }}>
                  <img src={image} alt="Chart" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <button onClick={removeImage} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--danger-color)', border: 'none', borderRadius: '4px', padding: '8px', color: 'white', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Terminal Settings</h2>
              <button className="icon-btn" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>AI Provider</label>
              <select value={aiProvider} onChange={(e) => { setAiProvider(e.target.value); localStorage.setItem('av_ai_provider', e.target.value); }}>
                <option value="gemini">Google Gemini (Live Web Search)</option>
                <option value="groq">Groq Llama 3 (Ultra Fast, High Limits)</option>
                <option value="openrouter">OpenRouter DeepSeek (Advanced Reasoning)</option>
                <option value="pollinations">Keyless AI (Free for Multi-User, No API Key needed)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Twelve Data API Key (Required for Groq/OpenRouter/Keyless)</label>
              <input type="password" value={apiKeys.twelvedata}
                onChange={(e) => { setApiKeys({...apiKeys, twelvedata: e.target.value}); localStorage.setItem('av_twelvedata_key', e.target.value); }}
                placeholder="Paste Twelve Data key"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Get a free key at twelvedata.com for live market data feed.</p>
            </div>

            {aiProvider !== 'pollinations' && (
              <div className="form-group">
                <label>{aiProvider.toUpperCase()} API Key</label>
                <input type="password" value={apiKeys[aiProvider]}
                  onChange={(e) => { 
                    setApiKeys({...apiKeys, [aiProvider]: e.target.value}); 
                    localStorage.setItem(`av_${aiProvider}_key`, e.target.value); 
                  }}
                  placeholder={`Paste ${aiProvider} API Key here`}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Keys are stored locally in your browser.</p>
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', marginTop: '24px' }} onClick={() => setShowSettings(false)}>
              Save & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
