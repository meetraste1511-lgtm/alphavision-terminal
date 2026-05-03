import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Layers, Globe, FileText, ArrowRight, CheckCircle, Zap, X } from 'lucide-react';
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
                />
              </div>
            </div>

            <div className="control-group">
              <label>Investment Horizon</label>
              <div className="horizon-toggle">
                {['Scalp', 'Swing', 'Long Term'].map(h => (
                  <button key={h} className={horizon === h ? 'active' : ''} onClick={() => setHorizon(h)}>{h}</button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>Data Requirement</label>
              <select value={requirement} onChange={(e) => setRequirement(e.target.value)}>
                <option value="Full Intelligence">Full Intelligence (All Data)</option>
                <option value="Macro Context">Macro & Political Risk</option>
                <option value="Fundamental Moat">Fundamentals & Moat</option>
                <option value="Sentiment Analysis">Social & Institutional Sentiment</option>
              </select>
            </div>

            <button 
              className="btn-run-research" 
              onClick={performResearch} 
              disabled={isSearching}
            >
              <CheckCircle size={16} />
              <span>{isSearching ? 'Synthesizing...' : 'Run Deep Research'}</span>
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

        <div className="research-main">
          {isSearching ? (
            <div className="research-placeholder searching">
              <Zap size={60} color="var(--accent-color)" className="spinning" style={{ marginBottom: '24px' }} />
              <h2>{searchStatus}</h2>
              <div className="search-live-logs">
                {searchLogs.map(log => (
                  <div key={log.id} className="log-item">
                    <span className="log-arrow">›</span> {log.msg}
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="research-placeholder error">
              <ShieldAlert size={60} color="var(--danger-color)" style={{ marginBottom: '24px' }} />
              <h2>Neural Handshake Failed</h2>
              <p>{error}</p>
              <button className="btn-retry" onClick={performResearch} style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--accent-color)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Retry Synthesis</button>
            </div>
          ) : report ? (
            <div className="report-container">
              <div className="report-header">
                <span className="badge-live">LIVE INSTITUTIONAL DATA</span>
                <h1>{query.toUpperCase()} RESEARCH DOSSIER</h1>
                <div className="report-meta">
                  Horizon: {horizon} | Intensity: {requirement} | Handshake: Verified
                </div>
              </div>
              <div className="markdown-body">
                <ResearchRenderer content={report} />
              </div>
            </div>
          ) : (
            <div className="research-placeholder idle">
              <Layers size={80} color="var(--accent-color)" style={{ opacity: 0.2, marginBottom: '24px' }} />
              <h1>INTELLIGENCE LAB</h1>
              <p>Enter a ticker or market theme to begin deep neural synthesis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntelligenceLab;
