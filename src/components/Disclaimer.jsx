import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import './Disclaimer.css';

export default function Disclaimer() {
  const [accepted, setAccepted] = useState(localStorage.getItem('av_disclaimer_accepted') === 'true');

  if (accepted) return null;

  const handleAccept = () => {
    localStorage.setItem('av_disclaimer_accepted', 'true');
    setAccepted(true);
  };

  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-card glass-panel animate-scale-in">
        <div className="disclaimer-header">
          <ShieldAlert size={32} className="text-amber-400" />
          <h2>Regulatory & Ethical Compliance</h2>
        </div>
        
        <div className="disclaimer-body">
          <p><strong>AlphaVision Terminal</strong> is a professional quantitative research and data analysis tool. By entering the terminal, you acknowledge and agree to the following:</p>
          
          <ul className="disclaimer-list">
            <li><strong>Not Financial Advice:</strong> All AI-generated confluence reports, scanners, and data summaries are for <strong>educational and research purposes only</strong>.</li>
            <li><strong>No Signal Guarantee:</strong> This platform does not provide buy/sell signals. It automates technical analysis patterns to assist your own independent research.</li>
            <li><strong>Risk Disclosure:</strong> Financial trading involves significant risk of loss. AlphaVision is not responsible for any financial outcomes resulting from the use of its data.</li>
            <li><strong>SEBI Compliance:</strong> This tool is an analysis software, not a registered investment advisory service.</li>
          </ul>
        </div>

        <div className="disclaimer-footer">
          <button className="btn-primary-glow" onClick={handleAccept}>
            <CheckCircle2 size={18} style={{ marginRight: '8px' }} />
            I Accept & Understand the Risks
          </button>
        </div>
      </div>
    </div>
  );
}
