import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Zap, Mail, Lock, LogIn, UserPlus, CheckCircle } from 'lucide-react';
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
        // Registration successful. Immediately show the Paywall so they can pay on the web terminal.
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
    return <Paywall userEmail={email} isNewRegistration={true} />;
  }

  return (
    <div className="auth-container">
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-logo">
            <Zap size={32} color="#2563eb" fill="#2563eb" />
            <h1>AlphaVision</h1>
          </div>
          
          <h2>Supercharge your <span>trading intelligence</span></h2>
          <p>
            Join the next generation of institutional traders using AI-driven research 
            to identify high-probability opportunities in global markets.
          </p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> 100+ Market Scanners
            </div>
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> AI Research Grounding
            </div>
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> Institutional Risk Guard
            </div>
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> Real-time Global Data
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="auth-subtitle">
              {isForgotPassword 
                ? 'Enter your email to receive a reset link.' 
                : 'Enter your credentials to access the terminal.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-success">{message}</div>}

            <div className="input-group">
              <label>Email Address</label>
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
                  <label>Password</label>
                  {!isSignUp && (
                    <button 
                      type="button" 
                      className="forgot-link"
                      onClick={() => setIsForgotPassword(true)}
                    >
                      Forgot password?
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
              {loading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}
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
                  Continue with Google
                </button>
              </>
            )}
            
            <button 
              type="button" 
              className="auth-submit-btn" 
              style={{ marginTop: '10px', background: '#475569' }}
              onClick={() => onLogin({ user: { email: 'meetraste1511@gmail.com', id: 'dev-user' } })}
            >
              Developer Bypass (Test Only)
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isForgotPassword ? (
                <button 
                  className="text-btn" 
                  onClick={() => { setIsForgotPassword(false); setIsSignUp(false); setError(null); setMessage(null); }}
                >
                  Back to Sign In
                </button>
              ) : (
                <>
                  {isSignUp ? "Already have an account?" : "Need terminal access?"}{' '}
                  <button
                    className="text-btn"
                    onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); setError(null); setMessage(null); }}
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up (₹1199/mo)'}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
