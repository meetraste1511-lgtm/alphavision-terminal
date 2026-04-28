import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Zap, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import './Auth.css';

export default function Auth({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
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
          <p className="auth-subtitle">Institutional Grade Trading Terminal</p>
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
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : isSignUp ? (
              <><UserPlus size={18} /> Create Account</>
            ) : (
              <><LogIn size={18} /> Access Terminal</>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isSignUp ? "Already have an account?" : "Need terminal access?"}{' '}
            <button
              className="text-btn"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up ($12/mo)'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
