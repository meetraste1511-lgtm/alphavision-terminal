import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Zap, Mail, Lock, CheckCircle } from 'lucide-react';
import './Auth.css';

import Paywall from './Paywall';

export default function Auth({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    console.log('Auth Component Mounted');
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Error logging in with Google.');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage('Password reset link sent! Check your email.');
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        console.log('SignUp Successful, showing Paywall');
        setShowPaywall(true);
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.session) {
          onLogin(data.session);
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  if (showPaywall) {
    console.log('Rendering Paywall Component');
    return <Paywall userEmail={email} isNewRegistration={true} />;
  }

  return (
    <div className="auth-container">
      <div className="auth-hero">
        <div className="auth-hero-visuals">
          <div className="data-node">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="node-label">Global Sentiment</span>
              <Zap size={16} color="#3b82f6" />
            </div>
            <div className="node-value">84.2%</div>
            <div className="node-graph"></div>
          </div>
          
          <div className="data-node">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="node-label">Neural Synapse</span>
              <Zap size={16} color="#3b82f6" />
            </div>
            <div className="node-value">Active</div>
            <div className="node-graph"></div>
          </div>

          <div className="data-node">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="node-label">Research Grounding</span>
              <Zap size={16} color="#3b82f6" />
            </div>
            <div className="node-value">Validated</div>
            <div className="node-graph"></div>
          </div>
        </div>

        <div className="auth-hero-content">
          <div className="auth-hero-logo">
            <Zap size={48} color="#3b82f6" fill="#3b82f6" />
            <h1>AlphaVision</h1>
          </div>
          
          <h2>Supercharge your <span>market research</span></h2>
          <p>
            The world's first AI-driven terminal dedicated to institutional-grade research, 
            market analysis, and educational market data synthesis.
          </p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> Educational Market Data
            </div>
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> Institutional Research AI
            </div>
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> Global News Synthesis
            </div>
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> Deep Search Grounding
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Terminal Access'}</h2>
            <p className="auth-subtitle">
              {isForgotPassword 
                ? 'Enter your email to receive a research session link.' 
                : 'Access the global research intelligence engine.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-success">{message}</div>}

            <div className="input-group">
              <label>Institutional Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Secure Password</label>
                  {!isSignUp && (
                    <button 
                      type="button" 
                      className="forgot-link"
                      onClick={() => setIsForgotPassword(true)}
                    >
                      Reset access?
                    </button>
                  )}
                </div>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Authenticating...' : isForgotPassword ? 'Send Link' : isSignUp ? 'Create Account' : 'Launch Terminal'}
            </button>

            {!isForgotPassword && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', opacity: 0.5 }}>
                  <div style={{ flex: 1, height: '1px', background: '#94a3b8' }}></div>
                  <div style={{ padding: '0 10px', fontSize: '0.9rem' }}>OR</div>
                  <div style={{ flex: 1, height: '1px', background: '#94a3b8' }}></div>
                </div>
                <button 
                  type="button" 
                  className="auth-submit-btn" 
                  style={{ background: '#ffffff', color: '#000000', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={handleGoogleLogin}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Institutional Sign In
                </button>
              </>
            )}
          </form>

          <div className="auth-footer">
            <p style={{ marginBottom: '16px' }}>
              {isForgotPassword ? (
                <button 
                  className="text-btn" 
                  onClick={() => { setIsForgotPassword(false); setIsSignUp(false); setError(null); setMessage(null); }}
                >
                  Back to Launch Pad
                </button>
              ) : (
                <>
                  {isSignUp ? "Already a researcher?" : "Need research access?"}{' '}
                  <button
                    className="text-btn"
                    onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); setError(null); setMessage(null); }}
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up (₹1199/mo)'}
                  </button>
                </>
              )}
            </p>
            
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <strong>Regulatory Disclaimer:</strong> AlphaVision is an AI-powered research and educational terminal. 
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
