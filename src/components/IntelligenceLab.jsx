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
      
      // Clinical Signal Check
      if (!geminiKey) {
        // Provide a mock report for development/testing
        const mockReport = `## MOCK INSTITUTIONAL DOSSIER\n\n**Query:** ${query}\n\n* This is a simulated research report generated because a valid Gemini API key was not provided.\n* It demonstrates the layout and functionality of the Research Lab.\n\n**Highlights:**\n- Market sentiment appears neutral.\n- No significant macro events detected.\n- Recommendation: Review once a valid key is configured.`;
        setReport(mockReport);
        setIsSearching(false);
        setSearchStatus('');
        addLog('Used mock report due to missing API key');
        return;
      }

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
          apiKey: geminiKey 
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
                  onKeyPress={(e) => e.key === 'Enter' && performResearch()}
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

            <button className="btn-run-research" onClick={performResearch} disabled={isSearching}>
              {isSearching ? <Zap className="spinning" size={16} /> : <BookOpen size={16} />}
              <span>{isSearching ? 'Ingesting Wires...' : 'Execute Deep Search'}</span>
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
          {report ? (
            <div className="report-content animate-fade-in">
              <div className="report-header">
                <div className="badge-live">LIVE INTEL</div>
                <h1>RESEARCH DOSSIER: {query.toUpperCase()}</h1>
                <div className="report-meta">Horizon: {horizon} | Intensity: {requirement}</div>
              </div>
              <div className="markdown-body">
                <ResearchRenderer content={report} />
              </div>
            </div>
          ) : error ? (
            <div className="research-placeholder error">
              <ShieldCheck size={64} color="var(--danger-color)" style={{ opacity: 0.5, marginBottom: '20px' }} />
              <h2 style={{ color: 'var(--danger-color)' }}>INTELLIGENCE BLOCKAGE</h2>
              <p>{error}</p>
              <button className="btn-run-research" style={{ width: 'auto', marginTop: '20px' }} onClick={performResearch}>Retry Deep Search</button>
            </div>
          ) : isSearching ? (
            <div className="research-placeholder loading">
              <div className="search-status-bar">
                <Globe className="spinning" size={24} color="var(--accent-color)" />
                <div className="status-labels">
                  <span className="status-main">{searchStatus}</span>
                  <span className="status-sub">DIRECT GOOGLE GROUNDING ACTIVE</span>
                </div>
              </div>
              <div className="search-live-logs">
                {searchLogs.map(log => (
                  <div key={log.id} className="log-item animate-slide-up">
                    <span className="log-arrow">▶</span> {log.msg}
                  </div>
                ))}
              </div>
              <div className="neural-ping">
                <div className="ping-dot pulse"></div>
                <span>Establishing Institutional Research Tunnel...</span>
              </div>
            </div>
          ) : !localStorage.getItem('av_gemini_key') ? (
            <div className="research-placeholder config">
              <ShieldCheck size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
              <h2>INTELLIGENCE OFFLINE</h2>
              <p>Grounding requires a Gemini API Key. Please configure it in Terminal Settings.</p>
              <div className="config-steps">
                <div>1. Open Settings (Top Right Icon)</div>
                <div>2. Paste Gemini Key in the designated field</div>
                <div>3. Click Save Settings to activate AV-LABS</div>
              </div>
            </div>
          ) : (
            <div className="research-placeholder ready">
              <Globe size={64} style={{ opacity: 0.1, marginBottom: '20px' }} />
              <h2>READY FOR SYNTHESIS</h2>
              <p>Enter a query to begin deep institutional research.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntelligenceLab;
