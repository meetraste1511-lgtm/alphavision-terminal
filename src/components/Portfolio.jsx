import React from 'react';
import { Zap, Cpu, BarChart3, Database, ShieldCheck, ExternalLink, Mail, Github, Linkedin, Code2, Globe, Activity } from 'lucide-react';
import './Portfolio.css';

const Portfolio = ({ onClose }) => {
  const highlights = [
    {
      title: "Full-Stack Architecture",
      icon: <Database className="h-6 w-6 text-blue-400" />,
      desc: "Vite + React frontend with a robust Vercel Serverless (Node.js) backend proxying market data to bypass CORS and ensure 99.9% uptime.",
      tech: ["React", "Vite", "Node.js", "Vercel"]
    },
    {
      title: "AI Quantitative Brain",
      icon: <Cpu className="h-6 w-6 text-purple-400" />,
      desc: "Multi-provider AI integration (Gemini, Groq, OpenRouter) with real-time Google Search grounding for macro-economic data ingestion.",
      tech: ["Gemini Pro", "Llama 3", "RAG"]
    },
    {
      title: "Market Data Pipeline",
      icon: <Globe className="h-6 w-6 text-emerald-400" />,
      desc: "Proprietary routing engine fetching live OHLC data from Binance (Crypto), Groww (Indian Markets), and Yahoo Finance (Global Indices).",
      tech: ["WebSocket", "REST API", "Proxy"]
    },
    {
      title: "Risk Management Engine",
      icon: <ShieldCheck className="h-6 w-6 text-amber-400" />,
      desc: "Automated position sizing based on fractional risk models, mandatory R:R enforcement, and local P&L performance tracking.",
      tech: ["Quant Logic", "LocalDB", "Supabase"]
    }
  ];

  return (
    <div className="portfolio-overlay">
      <div className="portfolio-card glass-panel animate-scale-in">
        <button className="portfolio-close" onClick={onClose}>&times;</button>
        
        <header className="portfolio-header">
          <div className="portfolio-badge">INSTITUTIONAL PITCH</div>
          <h1>AlphaVision Terminal</h1>
          <p className="portfolio-tagline">Engineered by a Full-Stack Quant Developer</p>
        </header>

        <div className="portfolio-body">
          <section className="portfolio-main">
            <h3>Technical Excellence</h3>
            <div className="highlights-grid">
              {highlights.map((item, i) => (
                <div key={i} className="highlight-card">
                  <div className="highlight-icon">{item.icon}</div>
                  <div className="highlight-content">
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                    <div className="highlight-tags">
                      {item.tech.map(t => <span key={t}>{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="portfolio-sidebar">
            <div className="system-health">
              <div className="health-header">
                <Activity size={16} className="animate-pulse text-emerald-400" />
                <span>System Status</span>
              </div>
              <div className="health-stats">
                <div className="health-item"><span>Latency</span><span>&lt;150ms</span></div>
                <div className="health-item"><span>AI Confluence</span><span>80%+ Required</span></div>
                <div className="health-item"><span>Data Integrity</span><span>Verified</span></div>
              </div>
            </div>

            <div className="developer-contact">
              <h3>Pitch the Developer</h3>
              <p>Ready to bring this level of execution to your team.</p>
              <div className="contact-btns">
                <a href="mailto:meetraste1511@gmail.com" className="contact-btn email">
                  <Mail size={16} /> Email Me
                </a>
                <div className="social-row">
                  <a href="https://github.com/meetraste1511-lgtm" target="_blank" rel="noreferrer" className="social-btn"><Github size={18} /></a>
                  <a href="#" className="social-btn"><Linkedin size={18} /></a>
                  <a href="#" className="social-btn"><Globe size={18} /></a>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="portfolio-footer">
          <div className="code-badge">
            <Code2 size={14} />
            <span>Built with 100% Clean Modular Architecture</span>
          </div>
          <button className="btn-primary-glow" onClick={onClose}>Explore Live Terminal</button>
        </footer>
      </div>
    </div>
  );
};

export default Portfolio;
