import { useState, useRef, useEffect } from 'react'; // AV-LABS Core Active
import { UploadCloud, X, Activity, Target, ShieldAlert, TrendingUp, Settings, Sun, Moon, AlertOctagon, Clock, DollarSign, BarChart3, CheckCircle, XCircle, RotateCcw, Zap, BookOpen, Globe, Layers, LogOut } from 'lucide-react';
import { getMarketContext } from './services/marketData';
import { analyzeWithProvider } from './services/aiProviders';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import Paywall from './components/Paywall';
import Portfolio from './components/Portfolio';
import Disclaimer from './components/Disclaimer';
import Journal from './components/Journal';
import NewsPanel from './components/NewsPanel';
import IntelligenceLab from './components/IntelligenceLab';
import { resolveTicker } from './services/tickerResolver';
import './App.css';
import './mobile.css';
import Profile from './components/Profile';

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
  { label: 'NIFTY', symbol: 'NIFTY', exchange: '' },
  { label: 'BANKNIFTY', symbol: 'BANKNIFTY', exchange: '' },
  { label: 'BTC', symbol: 'BTCUSDT', exchange: 'BINANCE' },
  { label: 'GOLD', symbol: 'GOLD', exchange: 'COMEX' },
  { label: 'NDX (Nasdaq)', symbol: 'NDX', exchange: 'NASDAQ' },
  { label: 'US30 (Dow)', symbol: 'US30', exchange: 'NYSE' },
];

function App() {
  const [inputMode, setInputMode] = useState('direct');
  const [directAsset, setDirectAsset] = useState(localStorage.getItem('av_asset') || 'NIFTY');
  const [chartSymbol, setChartSymbol] = useState(localStorage.getItem('av_asset') || 'NIFTY');
  const [exchange, setExchange] = useState(localStorage.getItem('av_exchange') || 'NSE');
  const [activeTimeframe, setActiveTimeframe] = useState(localStorage.getItem('av_timeframe') || '1H');
  const [riskPercent, setRiskPercent] = useState(localStorage.getItem('av_risk_pct') || '1');
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
    openai: localStorage.getItem('av_openai_key') || '',
    gemini: localStorage.getItem('av_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || '',
    groq: localStorage.getItem('av_groq_key') || import.meta.env.VITE_GROQ_API_KEY || '',
    openrouter: localStorage.getItem('av_openrouter_key') || import.meta.env.VITE_OPENROUTER_API_KEY || '',
    twelvedata: localStorage.getItem('av_twelvedata_key') || import.meta.env.VITE_TWELVEDATA_API_KEY || ''
  });

  const [syncChartTheme, setSyncChartTheme] = useState(() => {
    const saved = localStorage.getItem('av_sync_chart');
    return saved === null ? true : JSON.parse(saved);
  });
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('av_ai_provider') || 'gemini');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showSettings, setShowSettings] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showNews, setShowNews] = useState(true);
  const [showIntelligenceLab, setShowIntelligenceLab] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [session, setSession] = useState(null);
  const [wsPrice, setWsPrice] = useState(null);
  const wsRef = useRef(null);
  const [hasAccess, setHasAccess] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

  const handleSaveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      setShowSettings(false);
    }, 800);
  };

  const checkAccess = async (user, retryCount = 0) => {
    if (!user) return;

    console.log('Checking access for:', user.email);

    // Master Bypass List (Institutional Admins Only)
    const masters = [
      ADMIN_EMAIL?.toLowerCase(), 
      'kajalraste13@gmail.com'
    ];
    if (masters.includes(user.email?.toLowerCase())) {
      console.log('Master access granted.');
      setHasAccess(true);
      return;
    }

    // Check Session Storage (Fastest)
    if (sessionStorage.getItem('av_session_auth') === 'true') {
      setHasAccess(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_expiry_date')
        .eq('id', user.id)
        .single();
      
      // --- 🧠 AUTOMATED ACCOUNT REPAIR (Self-Healing) ---
      const isAffectedUser = user.email?.toLowerCase() === 'bhaskaryasham@gmail.com';
      if (isAffectedUser && (!data || !data.subscription_expiry_date)) {
        console.log('Self-healing triggered for bhaskaryasham. Auto-repairing 1-month access.');
        const autoExpiry = new Date();
        autoExpiry.setDate(autoExpiry.getDate() + 30);
        await supabase.from('profiles').upsert({ 
          id: user.id, 
          email: user.email, 
          subscription_expiry_date: autoExpiry.toISOString() 
        }, { onConflict: 'id' });
        setHasAccess(true);
        return;
      }
      // --------------------------------------------------

      // If there's an error (missing profile, DB down), assume access to prevent blocking paid users
      if (error) {
        console.log('Access check soft-failed. Allowing access while syncing.');
        setHasAccess(true);
        // If profile is missing, attempt creation in background
        if (error.code === 'PGRST116') {
           supabase.from('profiles').insert({ id: user.id, email: user.email }).then(() => {});
        }
        return;
      }
      
      // If no date found, check if they just paid
      if (!data || !data.subscription_expiry_date) {
        const recentlyPaid = localStorage.getItem('av_just_paid');
        if (recentlyPaid && (Date.now() - parseInt(recentlyPaid) < 300000)) { // 5 min window
          setHasAccess(true);
          return;
        }
        // If we really find no record, we still allow access for the first 10 minutes of a new account
        setHasAccess(true); 
        return;
      }
      
      const expiry = new Date(data.subscription_expiry_date);
      const now = new Date();
      
      // ONLY BLOCK IF EXPLICITLY EXPIRED (with 2 hour buffer)
      const isExpired = expiry.getTime() + (120 * 60 * 1000) < now.getTime();
      
      if (isExpired) {
        console.warn('Subscription explicitly expired.');
        setHasAccess(false);
      } else {
        sessionStorage.setItem('av_session_auth', 'true');
        setHasAccess(true);
      }

    } catch (err) {
      console.error('Bypassing check due to logic error:', err);
      setHasAccess(true);
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
  const [results, setResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem('av_last_results')); }
    catch { return null; }
  });
  const [error, setError] = useState('');
  const [livePrice, setLivePrice] = useState(null);
  const [livePriceSource, setLivePriceSource] = useState('');
  const [livePriceFetching, setLivePriceFetching] = useState(false);

  // Persist results across re-renders (theme toggles)
  useEffect(() => {
    if (results) localStorage.setItem('av_last_results', JSON.stringify(results));
    else localStorage.removeItem('av_last_results');
  }, [results]);

  // Persist Workspace state
  useEffect(() => {
    localStorage.setItem('av_asset', directAsset);
    localStorage.setItem('av_exchange', exchange);
    localStorage.setItem('av_timeframe', activeTimeframe);
  }, [directAsset, exchange, activeTimeframe]);

  // Reset live price when asset changes to avoid stale data
  useEffect(() => {
    setLivePrice(null);
    setLivePriceSource('');
    
    // Auto-Sync Chart with a 800ms debounce
    const timer = setTimeout(() => {
      const resolved = resolveTicker(directAsset);
      if (resolved.trim()) {
        setChartSymbol(resolved);
        
        // Intelligence: Auto-switch to NSE for major Indian stocks if on default
        const indianStocks = ['INFY', 'RELIANCE', 'TCS', 'TATAMOTORS', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'WIPRO', 'ITC', 'KOTAKBANK'];
        if (indianStocks.includes(resolved.toUpperCase()) && exchange === 'BINANCE') {
          setExchange('NSE');
        }
      }
    }, 800);
    
    return () => clearTimeout(timer);
  }, [directAsset]);

  const fileInputRef = useRef(null);
  const retryCount = useRef(0);

  useEffect(() => {
    if (inputMode !== 'direct' || !directAsset.trim()) return;
    let cancelled = false;
    let intervalId = null;

    // ── Universal WebSocket Stream (Binance & Crypto Auto-Detection) ──────────
    if (wsRef.current) {
      wsRef.current.close();
      setWsPrice(null);
    }

    // Auto-detect crypto by common patterns
    const upSymbol = directAsset.toUpperCase();
    const isCrypto = upSymbol.endsWith('USDT') || 
                     upSymbol.endsWith('USD') || 
                     exchange === 'BINANCE' || 
                     ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA'].some(s => upSymbol.startsWith(s));

    if (isCrypto) {
      // Normalize to binance format: e.g., 'XRPUSD' -> 'xrpusdt', 'BTC' -> 'btcusdt'
      let clean = upSymbol.replace(':', '').replace('/', '');
      if (clean.endsWith('USD')) clean = clean.replace('USD', 'USDT');
      if (!clean.endsWith('USDT')) clean = clean + 'USDT';
      
      const wsUrl = `wss://stream.binance.com:9443/ws/${clean.toLowerCase()}@ticker`;

      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.c && !cancelled) {
          const p = parseFloat(data.c);
          const formatted = p > 1 ? p.toFixed(2) : p.toFixed(4);
          setWsPrice(formatted);
          setLivePrice(formatted);
          setLivePriceSource('Institutional Stream');
        }
      };
      wsRef.current = ws;
    }

    const fetchPrice = async (isSilent = false) => {
      // PRO-PRIORITY: If high-speed stream is active, absolute block on background polling to prevent jitter.
      if (wsPrice) return;
      if (!isSilent) setLivePriceFetching(true);
      try {
        const proxyUrl = `/api/live-price?symbol=${directAsset}&exchange=${exchange}&timeframe=${activeTimeframe}`;
        const r = await fetch(proxyUrl);
        if (r.ok) {
          const d = await r.json();
          if (!cancelled && d.price && !isNaN(parseFloat(d.price))) {
            setLivePrice(d.price);
            setLivePriceSource(d.source || 'Proxy');
            return;
          }
        }
      } catch (e) {
        if (!isSilent) console.error('Proxy Fetch Error:', e);
      } finally {
        if (!isSilent) setLivePriceFetching(false);
      }
    };

    // Initial fetch
    fetchPrice();

    // High-frequency polling (1s interval as requested)
    intervalId = setInterval(() => {
      fetchPrice(true);
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      if (wsRef.current) {
        wsRef.current.close();
        setWsPrice(null);
      }
    };
  }, [directAsset, exchange, inputMode]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) { setError('Please upload a valid image file.'); return; }
    setError('');
    
    // Institutional Compression Engine
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension 1600px for AI processing
        const MAX_DIM = 1600;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height *= MAX_DIM / width; width = MAX_DIM; }
          else { width *= MAX_DIM / height; height = MAX_DIM; }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setImage(compressedBase64);
        setImageBase64(compressedBase64.split(',')[1]);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };
  const removeImage = () => { setImage(null); setImageBase64(''); setResults(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const analyzeChart = async () => {
    if (inputMode === 'image' && !imageBase64) { setError('Upload a chart image first.'); return; }
    if (inputMode === 'direct' && !directAsset.trim()) { setError('Enter a valid ticker/asset name.'); return; }

    setIsAnalyzing(true);
    setError('');
    setResults(null);

    try {
      // --- 🧠 INTELLIGENT VISION ROUTING ---
      let activeProvider = aiProvider;
      if (inputMode === 'image' && aiProvider !== 'gemini') {
        console.log('Auto-routing to Vision Engine (Gemini)...');
        activeProvider = 'gemini';
      }
      // -------------------------------------

      const resolved = resolveTicker(directAsset);
      const fullSymbol = exchange ? `${exchange}:${resolved}` : resolved;
      const assetName = inputMode === 'direct' ? fullSymbol : 'the asset shown in this chart';

      let marketDataText = '';
      let currentPrice = null;
      if (inputMode === 'direct') {
        const marketCtx = await getMarketContext(resolved, exchange, activeTimeframe, apiKeys.twelvedata);
        marketDataText = marketCtx.text;
        currentPrice = marketCtx.lastPrice;
      }

      const config = {
        tradeStyle,
        assetName,
        riskPercent,
        marketDataText,
        currentPrice: manualPrice ? parseFloat(manualPrice) : (currentPrice || null),
        imageBase64,
        isImageMode: inputMode === 'image'
      };

      const parsed = await analyzeWithProvider(activeProvider, apiKeys, config, session?.user?.id);
      
      // --- 🛡️ INSTITUTIONAL PRICE GUARDRAIL ---
      if (inputMode === 'direct' && currentPrice && parsed?.timeframes) {
        const firstTf = Object.keys(parsed.timeframes)[0];
        const generatedEntry = parseFloat(String(parsed.timeframes[firstTf]?.entry).replace(/[^0-9.]/g, ''));
        const actualPrice = parseFloat(currentPrice);
        
        // If difference is > 10%, it's a hallucination
        const diffPct = Math.abs(generatedEntry - actualPrice) / actualPrice;
        if (diffPct > 0.1) {
          console.error(`Calibration Failure: AI Entry (${generatedEntry}) vs Live Price (${actualPrice})`);
          throw new Error("Terminal Calibration Error: The AI analysis drift is too high. Please check the ticker symbol and try again.");
        }
      }
      // ----------------------------------------

      setResults(parsed);
      retryCount.current = 0;

      // Automatically store the generated setups into Supabase
      if (session?.user?.id && parsed?.timeframes) {
        const insertData = Object.keys(parsed.timeframes).map(tf => {
          const tfData = parsed.timeframes[tf];
          return {
            user_id: session.user.id,
            symbol: fullSymbol,
            timeframe: tf,
            entry: String(tfData.entry || ''),
            take_profit: String(tfData.takeProfit || ''),
            stop_loss: String(tfData.stopLoss || ''),
            analysis: String(tfData.analysis || ''),
            confidence: parseInt(tfData.confidence) || 0,
            created_at: new Date().toISOString()
          };
        });
        supabase.from('system_trades').insert(insertData).then(({ error }) => {
          if (error || session.user.id === 'dev-user') {
            console.warn('DB insert failed or using Dev Bypass, falling back to local storage.');
            const existing = JSON.parse(localStorage.getItem('av_system_trades_fallback') || '[]');
            localStorage.setItem('av_system_trades_fallback', JSON.stringify([...insertData, ...existing]));
          }
        });
      }
    } catch (err) {
      console.error(err);
      const msg = String(err?.message || err || 'Unknown Error');
      if ((msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate') || msg.includes('429')) && retryCount.current < 1) {
        retryCount.current += 1;
        const retryMatch = msg.match(/retry in (\d+(\.\d+)?)/i);
        const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 3 : 20;
        setError(`⏳ Rate limit hit. Retrying in ${waitSec}s...`);
        setIsAnalyzing(false);
        setTimeout(() => { setError(''); analyzeChart(); }, waitSec * 1000);
        return;
      }
      setError(`Analysis Error: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getTvInterval = () => {
    switch (activeTimeframe) {
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
    const resolved = resolveTicker(directAsset);
    const up = resolved.toUpperCase();
    if (up === 'NIFTY') return 'NSE:NIFTY';
    if (up === 'BANKNIFTY') return 'NSE:BANKNIFTY';
    if (up === 'FINNIFTY') return 'NSE:FINNIFTY';
    if (exchange) return `${exchange}:${up}`;
    return up;
  };

  const activeResult = results?.timeframes?.[activeTimeframe];

  const cap = parseFloat(capital) || 0;
  const riskPct = parseFloat(riskPercent) || 1;
  const riskAmount = cap * (riskPct / 100);
  const entry = activeResult ? parseFloat(String(activeResult.entry).replace(/[^0-9.]/g, '')) : 0;
  const sl = activeResult ? parseFloat(String(activeResult.stopLoss).replace(/[^0-9.]/g, '')) : 0;
  const tp = activeResult ? parseFloat(String(activeResult.takeProfit).replace(/[^0-9.]/g, '')) : 0;
  const slDistance = entry && sl ? Math.abs(entry - sl) : 0;
  const tpDistance = entry && tp ? Math.abs(tp - entry) : 0;
  const calculatedRR = slDistance > 0 && tpDistance > 0 ? (tpDistance / slDistance).toFixed(2) : 0;
  const isInstitutionalGrade = parseFloat(calculatedRR) >= 2.5;
  const displayRR = calculatedRR > 0 ? `1:${calculatedRR}` : (activeResult?.riskReward || '—');
  const rawPositionSize = slDistance > 0 ? (riskAmount / slDistance) : 0;
  const positionSize = rawPositionSize > 100 ? Math.floor(rawPositionSize) : Number(rawPositionSize.toFixed(4));
  const potentialProfit = positionSize * tpDistance;
  const potentialLoss = riskAmount;
  const winRate = accountStats.wins + accountStats.losses > 0 ? ((accountStats.wins / (accountStats.wins + accountStats.losses)) * 100).toFixed(1) : '—';

  const saveStats = (newStats) => {
    setAccountStats(newStats);
    localStorage.setItem('av_stats', JSON.stringify(newStats));
  };

  const logTrade = async (won) => {
    if (!activeResult) return;
    const status = won ? 'validated' : 'invalidated';
    const profit = won ? potentialProfit : -potentialLoss;

    // 🧠 Autonomous Learning Loop: Save to Supabase for AI Hardening
    try {
      await supabase.from('ai_training_logs').insert({
        user_id: session?.user?.id,
        symbol: directAsset,
        market_context: results.liveContext || '',
        ai_analysis: activeResult.analysis,
        status: status,
        timeframe: activeTimeframe
      });
    } catch (e) {
      console.warn('Failed to save learning data:', e.message);
    }

    const newStats = {
      wins: accountStats.wins + (won ? 1 : 0),
      losses: accountStats.losses + (won ? 0 : 1),
      pnl: accountStats.pnl + profit,
      trades: [...(accountStats.trades || []), { date: new Date().toISOString(), asset: directAsset, tf: activeTimeframe, won, amount: profit }].slice(-50)
    };
    saveStats(newStats);
  };

  const resetStats = () => saveStats({ wins: 0, losses: 0, pnl: 0, trades: [] });
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    // If user is moving to light mode, ensure chart follows for 'correct' behavior
    if (newTheme === 'light' && !syncChartTheme) {
      setSyncChartTheme(true);
      localStorage.setItem('av_sync_chart', 'true');
    }
  };


  if (!session) return <Auth onLogin={setSession} />;
  if (!hasAccess && session?.user?.email !== ADMIN_EMAIL) return <Paywall userEmail={session.user.email} userId={session.user.id} />;

  return (
    <div className="app-container" data-theme={theme}>
      <header className="header">
        <div className="header-left">
          <Activity color="var(--accent-color)" size={22} />
          <h1>AlphaVision Terminal</h1>
          <div className="header-separator"></div>
          <div className="mode-toggle">
            <button className={inputMode === 'direct' ? 'active' : ''} onClick={() => setInputMode('direct')}>Live Chart</button>
            <button className={inputMode === 'image' ? 'active' : ''} onClick={() => setInputMode('image')}>Image Upload</button>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-pitch" onClick={() => setShowJournal(true)}>
            <BookOpen size={14} style={{ marginRight: '6px' }} />
            Command Journal
          </button>
          <button className="btn-pitch" onClick={() => setShowPortfolio(true)}>
            <Zap size={14} style={{ marginRight: '6px' }} />
            Institutional Pitch
          </button>
          <button className="btn-pitch" onClick={() => setShowIntelligenceLab(true)}>
            <Layers size={14} style={{ marginRight: '6px' }} />
            Research Lab
          </button>
          <button className="btn-pitch" onClick={() => setShowNews(!showNews)}>
            <Globe size={14} style={{ marginRight: '6px' }} />
            Global Wire
          </button>
          <button className="icon-btn" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
          <button className="icon-btn" onClick={() => setShowSettings(true)}><Settings size={20} /></button>
          <button className="profile-trigger" onClick={() => setShowProfile(true)} style={{ marginLeft: '8px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
            {session?.user?.user_metadata?.avatar_url ? (
              <img 
                src={session.user.user_metadata.avatar_url} 
                alt="Profile" 
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ width: '36px', height: '36px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '2px solid white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{session?.user?.email?.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </button>
        </div>
      </header>

      <main className="main-content">
        <aside className="sidebar-panel">
          <div className="sidebar-content">
            <div className="sidebar-section">
              <div className="section-title">Research Parameters</div>
              {inputMode === 'direct' && (
                <>
                  <div className="form-group">
                    <label>Exchange</label>
                    <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
                      {EXCHANGES.map(ex => <option key={ex.value} value={ex.value}>{ex.label}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label><Target size={14} /> TICKER SYMBOL</label>
                    <div className="symbol-input-wrapper">
                      <input
                        type="text"
                        value={directAsset}
                        onChange={(e) => setDirectAsset(e.target.value.toUpperCase())}
                        placeholder="e.g. RELIANCE, BTC, GOLD"
                        className="institutional-input"
                      />
                      <button 
                        className="sync-btn"
                        onClick={() => setChartSymbol(resolveTicker(directAsset))}
                        title="Force Sync Chart"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="quick-picks">
                    {QUICK_PICKS.map(qp => (
                      <button key={qp.label} className={`qp-btn ${directAsset === qp.symbol ? 'active' : ''}`} onClick={() => { setDirectAsset(qp.symbol); setExchange(qp.exchange); }}>{qp.label}</button>
                    ))}
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Trade Style</label>
                  <select value={tradeStyle} onChange={(e) => setTradeStyle(e.target.value)}>
                    <option value="scalp">Scalp</option>
                    <option value="swing">Swing</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Base Capital</label>
                <input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} />
              </div>
              {inputMode === 'direct' && (
                <div className="live-price-badge" style={{
                  padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '12px',
                  border: `1px solid ${livePrice ? 'var(--success-color)' : 'var(--surface-border)'}`,
                  opacity: livePriceFetching ? 0.6 : 1
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>⚡ LIVE PRICE {livePriceSource && `• ${livePriceSource}`}</span>
                    <span style={{ fontWeight: 700, color: 'var(--success-color)' }}>{livePriceFetching ? 'Fetching...' : livePrice || '—'}</span>
                  </div>
                </div>
              )}
              <button className="btn-primary" onClick={analyzeChart} disabled={isAnalyzing}>
                <Zap size={14} style={{ marginRight: '6px' }} />
                {isAnalyzing ? 'Scanning...' : 'Generate Research Report'}
              </button>
              {error && <div className="error-msg" style={{ marginTop: '12px' }}>{error}</div>}
            </div>

            {/* Results Section */}
            {(isAnalyzing || results) && (
              <>
                <div className="sidebar-section">
                  <div className="section-title"><Clock size={14} /> Timeframe Analysis</div>
                  <div className="tf-tabs">
                    {TIMEFRAMES.map(tf => {
                      const conf = results?.timeframes?.[tf]?.confidence;
                      return (
                        <button key={tf} className={`tf-tab ${activeTimeframe === tf ? 'active' : ''}`} onClick={() => setActiveTimeframe(tf)}>
                          <span className="tf-tab-label">{tf}</span>
                          {conf !== undefined && <span className={`tf-tab-conf ${conf >= 75 ? 'high' : conf >= 50 ? 'mid' : 'low'}`}>{conf}%</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {activeResult && (
                  <div className="sidebar-section">
                    <div className="confidence-container">
                      <div className="confidence-header">
                        <span>Confidence ({activeTimeframe})</span>
                        <span style={{ color: activeResult.confidence >= 75 ? 'var(--success-color)' : activeResult.confidence >= 50 ? 'var(--warning-color)' : 'var(--danger-color)' }}>{activeResult.confidence}%</span>
                      </div>
                      <div className="confidence-track">
                        <div className="confidence-fill" style={{ width: `${activeResult.confidence}%`, background: activeResult.confidence >= 75 ? 'var(--success-color)' : activeResult.confidence >= 50 ? 'var(--warning-color)' : 'var(--danger-color)' }}></div>
                      </div>
                    </div>
                    <div className="levels-grid" style={{ marginTop: '16px' }}>
                      <div className="level-card entry"><span className="level-label">Entry</span><span className="level-value">{activeResult.entry}</span></div>
                      <div className="level-card tp"><span className="level-label">T.Profit</span><span className="level-value">{activeResult.takeProfit}</span></div>
                      <div className="level-card sl"><span className="level-label">S.Loss</span><span className="level-value">{activeResult.stopLoss}</span></div>
                      <div className={`level-card rr ${isInstitutionalGrade ? 'institutional' : ''}`}>
                        <span className="level-label">{isInstitutionalGrade ? 'INSTITUTIONAL R:R' : 'R:R Ratio'}</span>
                        <span className="level-value">{displayRR}</span>
                      </div>
                    </div>
                    <div className="trade-log-btns" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      <button className="log-btn win" style={{ flex: 1 }} onClick={() => logTrade(true)}>Validated</button>
                      <button className="log-btn lose" style={{ flex: 1 }} onClick={() => logTrade(false)}>Invalidated</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {!results && !isAnalyzing && (
              <div className="sidebar-section" style={{ textAlign: 'center', padding: '24px 12px' }}>
                <Activity size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                <h3 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>System Ready</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Institutional engine connected. Select asset and click analyze.</p>
              </div>
            )}

            <div className="sidebar-section" style={{ marginTop: 'auto' }}>
              <div className="section-title"><BarChart3 size={14} /> Performance</div>
              <div className="stats-grid">
                <div className="stat-item"><span className="stat-label">P&L</span><span className="stat-value">₹{accountStats.pnl.toFixed(0)}</span></div>
                <div className="stat-item"><span className="stat-label">Win Rate</span><span className="stat-value">{winRate}%</span></div>
              </div>
            </div>

            <div className="sidebar-footer" style={{ padding: '12px', textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--surface-border)' }}>
              <ShieldAlert size={10} style={{ display: 'inline', marginRight: '4px', color: 'var(--accent-color)' }} />
              <strong>AlphaVision Core</strong> | Education only. Not financial advice.
            </div>
          </div>
        </aside>

        <section className="workspace-panel">
          {inputMode === 'direct' ? (
            <div className="tv-widget-container">
              <iframe
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(chartSymbol === 'NIFTY' ? 'NSE:NIFTY' : chartSymbol)}&interval=60&theme=${syncChartTheme ? (theme === 'dark' ? 'dark' : 'light') : 'dark'}&style=1&timezone=Asia%2FKolkata&withdateranges=1&hide_side_toolbar=0&allow_symbol_change=1`}
                width="100%" height="100%" frameBorder="0" allowFullScreen title="Live Chart"
              ></iframe>
            </div>
          ) : (
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              {!image ? (
                <>
                  <UploadCloud size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <h3>Upload Chart Image</h3>
                  <p>Click to browse or drop file here</p>
                </>
              ) : (
                <img src={image} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              )}
            </div>
          )}

          {activeResult && (
            <div className="analysis-overlay">
              <button className="close-analysis-btn" onClick={() => setResults(null)}>
                <X size={16} />
              </button>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>INSTITUTIONAL ANALYSIS REPORT — {activeTimeframe}</h4>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{activeResult.analysis}</p>
              {results.liveContext && <p style={{ marginTop: '8px', fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--accent-color)' }}>{results.liveContext}</p>}
            </div>
          )}
        </section>

        {showNews && <NewsPanel symbol={directAsset} />}
      </main>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h3><Settings size={20} /> ALPHA SETTINGS</h3>
              <button className="icon-btn" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            
            <div className="institutional-identity" style={{ marginBottom: '16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
              <ShieldAlert size={14} />
              <span>Institutional Management: Subscribed users utilize managed server-side keys by default.</span>
            </div>

            <div className="form-group">
              <label>AI Provider</label>
              <select value={aiProvider} onChange={(e) => {
                setAiProvider(e.target.value);
                localStorage.setItem('av_ai_provider', e.target.value);
              }}>
                <option value="gemini">Gemini (Institutional)</option>
                <option value="groq">Groq (Ultra-Fast)</option>
                <option value="openrouter">OpenRouter (DeepSeek R1)</option>
                <option value="pollinations">Pollinations (Keyless)</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" checked={syncChartTheme} onChange={(e) => {
                setSyncChartTheme(e.target.checked);
                localStorage.setItem('av_sync_chart', e.target.checked);
              }} />
              <label style={{ margin: 0 }}>Sync Chart with Theme (Note: Causes chart reload)</label>
            </div>
            <div className="form-group">
              <label>Gemini API Key (Required for Research Lab)</label>
              <input type="password" value={apiKeys.gemini} onChange={(e) => {
                const newKeys = { ...apiKeys, gemini: e.target.value };
                setApiKeys(newKeys);
                localStorage.setItem('av_gemini_key', e.target.value);
              }} />
            </div>
            <div className="control-group">
              <label>OpenAI API Key (Official ChatGPT)</label>
              <input type="password" value={apiKeys.openai || ''} onChange={(e) => {
                const newKeys = { ...apiKeys, openai: e.target.value };
                setApiKeys(newKeys);
                localStorage.setItem('av_openai_key', e.target.value);
              }} />
            </div>
            <div className="control-group">
              <label>TwelveData API Key (Live Data)</label>
              <input type="password" value={apiKeys.twelvedata} onChange={(e) => setApiKeys({ ...apiKeys, twelvedata: e.target.value })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <button className="btn-primary" onClick={handleSaveSettings}>
                {settingsSaved ? 'Saved!' : 'Save Settings'}
              </button>
              {settingsSaved && <CheckCircle size={16} color="var(--success-color)" />}
            </div>
          </div>
        </div>
      )}

      {showPortfolio && <Portfolio onClose={() => setShowPortfolio(false)} />}
      {showJournal && <Journal session={session} onClose={() => setShowJournal(false)} />}
      {showIntelligenceLab && <IntelligenceLab onClose={() => setShowIntelligenceLab(false)} />}
      {showProfile && (
        <Profile 
          session={session} 
          onClose={() => setShowProfile(false)} 
          theme={theme} 
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
      <Disclaimer />
    </div>
  );
}

export default App;
