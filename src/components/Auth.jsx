import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Zap, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
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
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <div className="logo">
            <Zap size={28} color="var(--accent-color)" fill="var(--accent-color)" />
            <h2>AlphaVision</h2>
          </div>
          <p className="auth-subtitle">
            {isForgotPassword ? 'Reset Your Password' : 'Institutional Grade Trading Terminal'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          <div className="input-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div className="input-group">
              <label>Password</label>
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
              {!isSignUp && (
                <button 
                  type="button" 
                  className="forgot-link" 
                  onClick={() => { setIsForgotPassword(true); setError(null); setMessage(null); }}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : isForgotPassword ? (
              'Send Reset Link'
            ) : isSignUp ? (
              <><UserPlus size={18} /> Create Account</>
            ) : (
              <><LogIn size={18} /> Access Terminal</>
            )}
          </button>
          
          {!isForgotPassword && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', opacity: 0.5 }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--text-secondary)' }}></div>
                <div style={{ padding: '0 10px', fontSize: '0.9rem' }}>OR</div>
                <div style={{ flex: 1, height: '1px', background: 'var(--text-secondary)' }}></div>
              </div>
              <button 
                type="button" 
                className="btn-primary auth-submit-btn" 
                style={{ background: '#ffffff', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
            className="btn-primary auth-submit-btn" 
            style={{ marginTop: '10px', background: 'var(--text-secondary)' }}
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
  );
}
