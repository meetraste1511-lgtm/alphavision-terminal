import React from 'react';
import { Settings, UserPlus, HelpCircle, LifeBuoy, Bell, Moon, Sun, Globe, LogOut, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Profile({ session, onClose, theme, onToggleTheme }) {
  const user = session?.user;
  const metadata = user?.user_metadata || {};
  
  // Extract Name: Google Full Name or Email prefix
  const displayName = metadata.full_name || user?.email?.split('@')[0] || 'Researcher';
  const displayAvatar = metadata.avatar_url || null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="profile-dropdown-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div 
        className="profile-dropdown-card" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          position: 'absolute', 
          top: '60px', 
          right: '20px', 
          width: '280px', 
          background: 'var(--bg-primary)', 
          borderRadius: '12px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)', 
          border: '1px solid var(--surface-border)',
          overflow: 'hidden',
          animation: 'slideDown 0.2s ease-out'
        }}
      >
        {/* User Header */}
        <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {displayAvatar ? (
            <img src={displayAvatar} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ padding: '8px 0' }}>
          <button className="dropdown-item" style={itemStyle}>
            <Settings size={18} />
            <span>Settings and billing</span>
          </button>
          
          <button className="dropdown-item" style={{ ...itemStyle, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserPlus size={18} />
              <span>Refer a friend</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>$0</span>
          </button>

          <div style={{ height: '1px', background: 'var(--surface-border)', margin: '8px 0' }}></div>

          <button className="dropdown-item" style={itemStyle}>
            <HelpCircle size={18} />
            <span>Help Center</span>
          </button>
          
          <button className="dropdown-item" style={itemStyle}>
            <LifeBuoy size={18} />
            <span>Support requests</span>
          </button>
          
          <button className="dropdown-item" style={{ ...itemStyle, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Bell size={18} />
              <span>What's new</span>
            </div>
            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>11</span>
          </button>

          <div style={{ height: '1px', background: 'var(--surface-border)', margin: '8px 0' }}></div>

          <button className="dropdown-item" style={{ ...itemStyle, justifyContent: 'space-between' }} onClick={onToggleTheme}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              <span>Dark theme</span>
            </div>
            <div style={{ width: '32px', height: '18px', background: theme === 'dark' ? 'var(--accent-color)' : '#cbd5e1', borderRadius: '9px', position: 'relative' }}>
              <div style={{ width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: theme === 'dark' ? '16px' : '2px', transition: 'all 0.2s' }}></div>
            </div>
          </button>

          <button className="dropdown-item" style={{ ...itemStyle, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={18} />
              <span>Language</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>English ›</span>
          </button>

          <div style={{ height: '1px', background: 'var(--surface-border)', margin: '8px 0' }}></div>

          <button className="dropdown-item" style={{ ...itemStyle, color: '#ef4444' }} onClick={handleSignOut}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <style>{`
        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: none;
          border: none;
          color: var(--text-primary);
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
        }
        .dropdown-item:hover {
          background: var(--bg-secondary);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const itemStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 16px',
  background: 'none',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  cursor: 'pointer',
  textAlign: 'left',
};
