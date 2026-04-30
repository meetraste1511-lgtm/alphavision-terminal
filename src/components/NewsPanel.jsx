import React, { useState, useEffect } from 'react';
import { Globe, TrendingUp, TrendingDown, Clock, RefreshCcw } from 'lucide-react';
import './NewsPanel.css';

const NewsPanel = ({ symbol }) => {
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/market-news?symbol=${symbol || ''}`);
      if (response.ok) {
        const data = await response.json();
        setNews(data.news || []);
      }
    } catch (e) {
      setError('Failed to sync with news wire');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, [symbol]);

  const getTimeAgo = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <div className="news-panel">
      <div className="news-header">
        <div className="header-title">
          <Globe size={16} color="var(--accent-color)" />
          <span>GLOBAL INTELLIGENCE</span>
        </div>
        <button className="refresh-btn" onClick={fetchNews} disabled={isLoading}>
          <RefreshCcw size={14} className={isLoading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="news-feed">
        {isLoading && news.length === 0 ? (
          <div className="news-status">Syncing with global wires...</div>
        ) : error ? (
          <div className="news-status error">{error}</div>
        ) : (
          news.map((item) => (
            <div key={item.id} className="news-item">
              <div className="news-meta">
                <span className={`impact-badge ${item.impact.toLowerCase()}`}>
                  {item.impact} IMPACT
                </span>
                <span className="news-time">
                  <Clock size={10} /> {getTimeAgo(item.time)}
                </span>
              </div>
              <h3 className="news-title">{item.title}</h3>
              <div className="news-footer">
                <span className="news-source">{item.source}</span>
                <div className={`sentiment-badge ${item.sentiment.toLowerCase()}`}>
                  {item.sentiment === 'Bullish' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {item.sentiment.toUpperCase()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="news-disclaimer">
        Real-time financial data via AlphaVision Global Wire
      </div>
    </div>
  );
};

export default NewsPanel;
