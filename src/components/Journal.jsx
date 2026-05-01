import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, TrendingUp, Brain, Plus, Calendar, Target, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Journal.css';

const Journal = ({ session, onClose }) => {
  const [activeTab, setActiveTab] = useState('ledger');
  const [logs, setLogs] = useState([]);
  const [systemTrades, setSystemTrades] = useState([]);
  const [checklist, setChecklist] = useState({ news: false, sentiment: false, bias: false, risk: false });
  const [formData, setFormData] = useState({
    asset: '', type: 'LONG', pnl: '', notes: '', mood: 'Calm', discipline: 5,
    mistake: 'None', setup: 'Order Block'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MISTAKES = ['None', 'FOMO Entry', 'Revenge Trade', 'Late Exit', 'Moved SL', 'Over-Leveraged', 'News Spike'];
  const SETUPS = ['Order Block', 'Fair Value Gaps', 'Liquidity Sweep', 'Trendline Break', 'Mean Reversion'];

  useEffect(() => {
    const fetchLogs = async () => {
      if (!session?.user?.id) return;
      const savedChecklist = localStorage.getItem(`av_checklist_${session.user.id}`);
      if (savedChecklist) setChecklist(JSON.parse(savedChecklist));

      const { data, error } = await supabase
        .from('trading_journal')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        const localLogs = JSON.parse(localStorage.getItem('av_journal_fallback') || '[]');
        setLogs(localLogs);
      } else if (data) {
        setLogs(data);
      }

      // Fetch AI System Trades
      const { data: sysData } = await supabase
        .from('system_trades')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (sysData) setSystemTrades(sysData);
    };
    fetchLogs();
  }, [session?.user?.id]);

  const toggleChecklist = (key) => {
    const newChecklist = {...checklist, [key]: !checklist[key]};
    setChecklist(newChecklist);
    localStorage.setItem(`av_checklist_${session.user.id}`, JSON.stringify(newChecklist));
  };

  const addLog = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newLog = {
      user_id: session.user.id,
      ...formData,
      pnl: parseFloat(formData.pnl),
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('trading_journal').insert(newLog).select();
    if (error) {
      const localLogs = [newLog, ...logs];
      setLogs(localLogs);
      localStorage.setItem('av_journal_fallback', JSON.stringify(localLogs));
    } else if (data) {
      setLogs([data[0], ...logs]);
    }
    setFormData({ asset: '', type: 'LONG', pnl: '', notes: '', mood: 'Calm', discipline: 5, mistake: 'None', setup: 'Order Block' });
    setIsSubmitting(false);
  };

  const calculateStats = () => {
    if (logs.length === 0) return { totalPnl: 0, winRate: 0, expectancy: 0, profitFactor: 0 };
    
    const profits = logs.filter(l => l.pnl > 0).reduce((a, b) => a + parseFloat(b.pnl), 0);
    const losses = Math.abs(logs.filter(l => l.pnl < 0).reduce((a, b) => a + parseFloat(b.pnl), 0));
    
    const winRate = (logs.filter(l => l.pnl > 0).length / logs.length);
    const avgWin = logs.filter(l => l.pnl > 0).length > 0 ? (profits / logs.filter(l => l.pnl > 0).length) : 0;
    const avgLoss = logs.filter(l => l.pnl < 0).length > 0 ? (losses / logs.filter(l => l.pnl < 0).length) : 1;
    
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
    const profitFactor = losses === 0 ? profits : (profits / losses).toFixed(2);
    const totalPnl = profits - losses;

    return { totalPnl, winRate: (winRate * 100).toFixed(1), expectancy: expectancy.toFixed(2), profitFactor };
  };

  const { totalPnl, winRate, expectancy, profitFactor } = calculateStats();

  return (
    <div className="journal-overlay">
      <div className="journal-window">
        <div className="journal-sidebar">
          <div className="journal-branding">
            <BookOpen size={20} color="var(--accent-color)" />
            <span>COMMAND CENTER</span>
          </div>
          
          <div className="mission-checklist">
            <div className="sidebar-label">DAILY PRE-FLIGHT</div>
            {Object.keys(checklist).map(key => (
              <div key={key} className={`checklist-item ${checklist[key] ? 'checked' : ''}`} onClick={() => toggleChecklist(key)}>
                {checklist[key] ? <CheckCircle2 size={16} /> : <div className="check-box" />}
                <span className="capitalize">{key.toUpperCase()} CHECK</span>
              </div>
            ))}
          </div>

          <div className="journal-stats-summary">
            <div className="stat-card gold">
              <span className="stat-card-label">EDGE EXPECTANCY</span>
              <span className={`stat-card-value ${expectancy >= 0 ? 'profit' : 'loss'}`}>
                ₹{expectancy}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">PROFIT FACTOR</span>
              <span className="stat-card-value">{profitFactor}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">NET P&L</span>
              <span className={`stat-card-value ${totalPnl >= 0 ? 'profit' : 'loss'}`}>
                ₹{totalPnl.toLocaleString()}
              </span>
            </div>
          </div>

          <button className="btn-close-journal" onClick={onClose}>
            <X size={16} /> Close Terminal
          </button>
        </div>

        <div className="journal-main">
          <header className="journal-main-header">
            <div className="tab-group">
              <button className={activeTab === 'ledger' ? 'active' : ''} onClick={() => setActiveTab('ledger')}>TRADING LEDGER</button>
              <button className={activeTab === 'ai_setups' ? 'active' : ''} onClick={() => setActiveTab('ai_setups')}>AI SETUPS</button>
              <button className={activeTab === 'intel' ? 'active' : ''} onClick={() => setActiveTab('intel')}>PERFORMANCE INTEL</button>
            </div>
          </header>

          <div className="journal-content">
            {activeTab === 'ledger' ? (
              <>
                <form className="journal-form" onSubmit={addLog}>
                  <div className="form-grid-top">
                    <div className="form-input-group">
                      <label>Asset Symbol</label>
                      <input placeholder="BTCUSDT" value={formData.asset} onChange={e => setFormData({...formData, asset: e.target.value.toUpperCase()})} required />
                    </div>
                    <div className="form-input-group">
                      <label>Strategy / Setup</label>
                      <select value={formData.setup} onChange={e => setFormData({...formData, setup: e.target.value})}>
                        {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-input-group">
                      <label>Realized P&L (INR)</label>
                      <input type="number" step="any" placeholder="0.00" value={formData.pnl} onChange={e => setFormData({...formData, pnl: e.target.value})} required />
                    </div>
                  </div>
                  
                  <div className="form-grid-top" style={{ marginTop: '12px' }}>
                    <div className="form-input-group">
                      <label>Execution Error / Mistake</label>
                      <select value={formData.mistake} onChange={e => setFormData({...formData, mistake: e.target.value})}>
                        {MISTAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-input-group" style={{ gridColumn: 'span 2' }}>
                      <label>Mood & Psychological State</label>
                      <div className="mood-selector">
                        {['Calm', 'Fear', 'Greed', 'Anxious', 'Aggressive'].map(m => (
                          <button key={m} type="button" className={formData.mood === m ? 'active' : ''} onClick={() => setFormData({...formData, mood: m})}>{m}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form-input-group" style={{ marginTop: '12px' }}>
                    <label>Trade Rationale (The "Why")</label>
                    <textarea placeholder="Thesis: Price reacted to 4H OB after liquidating previous day high..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                  </div>

                  <div className="form-footer-row">
                    <div className="institutional-hint">
                      <ShieldCheck size={14} color="var(--success-color)" />
                      <span>Data synced with AlphaVision Cloud</span>
                    </div>
                    <button type="submit" className="btn-submit-log" disabled={isSubmitting}>
                      {isSubmitting ? 'COMMITTING...' : 'COMMIT TO LEDGER'}
                    </button>
                  </div>
                </form>

                <div className="ledger-table">
                  <div className="ledger-header">
                    <span>DATE</span>
                    <span>ASSET</span>
                    <span>SETUP</span>
                    <span>MISTAKE</span>
                    <span style={{ textAlign: 'right' }}>RESULT</span>
                  </div>
                  <div className="ledger-rows">
                    {logs.length > 0 ? (
                      logs.map(log => (
                        <div key={log.id || log.created_at} className="ledger-row">
                          <span className="ledger-date">{new Date(log.created_at).toLocaleDateString()}</span>
                          <span className="ledger-asset">{log.asset}</span>
                          <span className="ledger-setup">{log.setup}</span>
                          <span className={`ledger-mistake ${log.mistake !== 'None' ? 'error' : ''}`}>{log.mistake}</span>
                          <span className={`ledger-pnl ${log.pnl >= 0 ? 'profit' : 'loss'}`}>
                            {log.pnl >= 0 ? '+' : ''}₹{parseFloat(log.pnl).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="empty-ledger">Establish your track record. Log your first mission.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="intel-panel">
                <div className="intel-grid">
                  <div className="intel-card heatmap">
                    <h4>Mistake Attribution Heatmap</h4>
                    <div className="mistake-list">
                      {MISTAKES.filter(m => m !== 'None').map(m => {
                        const count = logs.filter(l => l.mistake === m).length;
                        const cost = logs.filter(l => l.mistake === m).reduce((a, b) => a + parseFloat(b.pnl), 0);
                        return (
                          <div key={m} className="mistake-stat">
                            <span className="m-name">{m}</span>
                            <span className="m-count">{count} Occurrences</span>
                            <span className={`m-cost ${cost < 0 ? 'loss' : ''}`}>₹{cost.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="intel-card coach">
                    <h4>AI Performance Auditor</h4>
                    <div className="coach-content">
                      <div className="coach-placeholder">
                        <Brain size={32} color="var(--accent-color)" />
                        <p>Analyze your last {logs.length} trades for institutional leaks?</p>
                        <button className="btn-audit" onClick={() => alert("Audit analysis initialized...")}>RUN PERFORMANCE AUDIT</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'ai_setups' ? (
              <div className="ledger-table" style={{ height: '100%' }}>
                <div className="ledger-header" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 2fr' }}>
                  <span>DATE</span>
                  <span>ASSET</span>
                  <span>TF</span>
                  <span style={{ color: 'var(--accent-color)' }}>ENTRY</span>
                  <span style={{ color: 'var(--success-color)' }}>TARGET</span>
                  <span style={{ color: 'var(--danger-color)' }}>STOP LOSS</span>
                  <span>CONFIDENCE</span>
                </div>
                <div className="ledger-rows">
                  {systemTrades.length > 0 ? (
                    systemTrades.map(trade => (
                      <div key={trade.id} className="ledger-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 2fr', cursor: 'default' }}>
                        <span className="ledger-date">{new Date(trade.created_at).toLocaleDateString()}</span>
                        <span className="ledger-asset" style={{ fontWeight: 'bold' }}>{trade.symbol}</span>
                        <span className="ledger-setup">{trade.timeframe}</span>
                        <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{trade.entry}</span>
                        <span style={{ fontFamily: 'monospace', color: 'var(--success-color)' }}>{trade.take_profit}</span>
                        <span style={{ fontFamily: 'monospace', color: 'var(--danger-color)' }}>{trade.stop_loss}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '4px', background: 'var(--surface-border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${trade.confidence}%`, background: trade.confidence >= 75 ? 'var(--success-color)' : trade.confidence >= 50 ? 'var(--warning-color)' : 'var(--danger-color)' }}></div>
                          </div>
                          <span style={{ fontSize: '0.7rem' }}>{trade.confidence}%</span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-ledger">No AI setups generated yet. Analyze a chart to get started.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Journal;
