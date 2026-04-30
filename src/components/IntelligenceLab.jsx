import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Layers, Globe, FileText, ArrowRight, ShieldCheck, Zap, X } from 'lucide-react';
import './IntelligenceLab.css';

// Institutional Dossier Renderer (Internal)
const ResearchRenderer = ({ content }) => (
  <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
    {content}
  </div>
);

const IntelligenceLab = ({ onClose }) => {
  const [query, setQuery] = useState(localStorage.getItem('av_research_query') || '');
  const [horizon, setHorizon] = useState(localStorage.getItem('av_research_horizon') || 'Long Term');
  const [requirement, setRequirement] = useState(localStorage.getItem('av_research_requirement') || 'Full Intelligence');
  const [report, setReport] = useState(() => {
    try { return localStorage.getItem('av_research_report') || null; }
    catch { return null; }
  });
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');
  const [searchLogs, setSearchLogs] = useState([]);

  // Persist state
  useEffect(() => {
    localStorage.setItem('av_research_query', query);
    localStorage.setItem('av_research_horizon', horizon);
    localStorage.setItem('av_research_requirement', requirement);
    if (report) localStorage.setItem('av_research_report', report);
    else localStorage.removeItem('av_research_report');
  }, [query, horizon, requirement, report]);

  const addLog = (msg) => setSearchLogs(prev => [...prev.slice(-4), { id: Date.now(), msg }]);

  const performResearch = async () => {
    if (!query.trim() || query.length < 3) {
      setError('QUERY TOO SHORT: Institutional research requires at least 3 characters of context.');
      return;
    }
    setIsSearching(true);
    setReport(null);
    setError(null);
    setSearchLogs([]);
    setSearchStatus('Connecting to Google Grounding...');
    
    addLog(`Initiating deep search for: ${query}`);

    try {
      addLog('Verifying neural handshake...');
      setTimeout(() => addLog('Analyzing global financial wires...'), 2000);
      setTimeout(() => addLog('Scraping SEC filings & Macro news...'), 4000);

      const geminiKey = localStorage.getItem('av_gemini_key') || '';
      const openaiKey = localStorage.getItem('av_openai_key') || '';
      
      addLog('Signal transmitted. Awaiting institutional synthesis...');

      const response = await fetch('/api/deep-research', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          query, 
          timeHorizon: horizon, 
          dataRequirement: requirement,
          apiKey: geminiKey,
          openaiKey: openaiKey
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        addLog('Intelligence synthesis complete.');
        setReport(data.report);
      } else {
        setError(data.details || data.error || 'Intelligence Engine Timeout');
      }
    } catch (e) {
      setError('Neural Link Failure: Check internet connection or API keys.');
    } finally {
      setIsSearching(false);
      setSearchStatus('');
    }
  };

  return (
    <div className="research-modal-overlay">
      <div className="research-lab-container">
        <div className="research-sidebar">
          <div className="sidebar-top">
            <div className="lab-logo">
              <Layers color="var(--accent-color)" size={20} />
              <span>AV-LABS</span>
            </div>
            <button className="close-lab-btn" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="research-controls">
            <div className="control-group">
              <label>Research Query</label>
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="e.g. NVIDIA 2025 GPU Demand vs Blackwell Delay..." 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled
                />
              </div>
            </div>

            <div className="control-group">
              <label>Investment Horizon</label>
              <div className="horizon-toggle">
                {['Scalp', 'Swing', 'Long Term'].map(h => (
                  <button key={h} className={horizon === h ? 'active' : ''} disabled>{h}</button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>Data Requirement</label>
              <select value={requirement} disabled>
                <option value="Full Intelligence">Full Intelligence (All Data)</option>
                <option value="Macro Context">Macro & Political Risk</option>
                <option value="Fundamental Moat">Fundamentals & Moat</option>
                <option value="Sentiment Analysis">Social & Institutional Sentiment</option>
              </select>
            </div>

            <button className="btn-run-research" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              <ShieldCheck size={16} />
              <span>Feature In Development</span>
            </button>
          </div>

          <div className="research-tips">
            <h4>STRATEGIC COMMANDS:</h4>
            <ul>
              <li>Analyze specific catalysts (e.g. "FOMC Pivot Impact").</li>
              <li>Request cross-asset correlation (e.g. "BTC vs DXY").</li>
              <li>Research regarding the stock effectively at institutional level.</li>
              <li>Deep-dive into balance sheets and revenue moats.</li>
            </ul>
          </div>
        </div>

        <div className="research-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div className="research-placeholder config" style={{ textAlign: 'center', maxWidth: '600px' }}>
            <Layers size={80} color="var(--accent-color)" style={{ opacity: 0.5, marginBottom: '24px' }} />
            <h1 style={{ fontSize: '2rem', marginBottom: '16px', letterSpacing: '0.05em' }}>AV-LABS IS COMING SOON</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
              We are currently re-architecting the backend intelligence engine for <strong>faster, more secure, and highly scalable</strong> AI research synthesis.
            </p>
            <div className="config-steps" style={{ textAlign: 'left', background: 'rgba(var(--accent-rgb), 0.05)', padding: '24px', borderRadius: '12px' }}>
              <div style={{ marginBottom: '12px', fontWeight: 'bold', color: 'var(--accent-color)' }}>UPCOMING FEATURES:</div>
              <div style={{ padding: '8px 0' }}>• Real-time Bloomberg & Reuters Terminal Integration</div>
              <div style={{ padding: '8px 0' }}>• Sub-second Llama 3 70B Institutional Inferencing</div>
              <div style={{ padding: '8px 0' }}>• Advanced Cryptographic Data Security</div>
            </div>
            <p style={{ marginTop: '32px', fontSize: '0.9rem', opacity: 0.5 }}>
              Thank you for testing AlphaVision. Your feedback during this beta helps us build the ultimate trading terminal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceLab;
