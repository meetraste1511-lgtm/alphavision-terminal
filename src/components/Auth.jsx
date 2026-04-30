import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Zap, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import './Auth.css';

export default function Auth({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage('Password reset link sent! Check your email.');
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Registration successful! Please check your email for a confirmation link.');
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
                  {isSignUp ? 'Sign In' : 'Sign Up ($12/mo)'}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
