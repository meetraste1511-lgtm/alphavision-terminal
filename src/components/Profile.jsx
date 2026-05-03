import React, { useState, useEffect } from 'react';
import { Settings, UserPlus, HelpCircle, LifeBuoy, Bell, Moon, Sun, Globe, LogOut, X, Zap, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Profile({ session, onClose, theme, onToggleTheme, onOpenSettings }) {
  const user = session?.user;
  const metadata = user?.user_metadata || {};
  const [profileData, setProfileData] = useState(null);
  
  const displayName = metadata.full_name || user?.email?.split('@')[0] || 'Researcher';
  const displayAvatar = metadata.avatar_url || null;

  useEffect(() => {
    async function fetchDetails() {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfileData(data);
        
        // Auto-generate referral code if missing
        if (!data.referral_code) {
          const newCode = `AV-${user.id.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
          await supabase.from('profiles').update({ referral_code: newCode }).eq('id', user.id);
          setProfileData(prev => ({ ...prev, referral_code: newCode }));
        }
      }
    }
    fetchDetails();
  }, [user.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="profile-dropdown-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
      <div 
        className="profile-command-center" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          position: 'absolute', 
          top: '60px', 
          right: '16px', 
          width: '280px', 
          background: 'rgba(255, 255, 255, 0.98)', 
          backdropFilter: 'blur(20px)',
          borderRadius: '12px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)', 
          border: '1px solid rgba(0,0,0,0.08)',
          overflow: 'hidden',
          animation: 'revealDropdown 0.2s ease-out',
          color: '#1e293b'
        }}
      >
        {/* Institutional Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            {displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '10px', border: '2px solid #3b82f6' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', border: '1px solid white' }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', background: '#10b981', border: '2px solid white', borderRadius: '50%' }}></div>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
        </div>

        {/* Intelligence Metrics */}
        <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Research Expiry</div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: profileData?.subscription_expiry_date ? '#334155' : '#ef4444' }}>
              {profileData?.subscription_expiry_date ? new Date(profileData.subscription_expiry_date).toLocaleDateString() : 'No Active Plan'}
            </div>
          </div>
          <div style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Access Tier</div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={12} /> Alpha
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div style={{ padding: '12px 0' }}>
          <button className="dropdown-item" style={itemStyle} onClick={() => { onOpenSettings(); onClose(); }}>
            <div className="icon-wrap"><Settings size={18} /></div>
            <span>Terminal Settings</span>
          </button>
          
          <button className="dropdown-item" style={itemStyle}>
            <div className="icon-wrap"><Zap size={18} /></div>
            <span>API Management</span>
          </button>
 
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="icon-wrap"><UserPlus size={18} /></div>
              <span style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '700' }}>Referral Network</span>
              <span style={{ marginLeft: 'auto', fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>₹{profileData?.referral_balance || 0}</span>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
              padding: '16px', 
              borderRadius: '16px', 
              border: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Your Referral Code</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: '700', fontFamily: 'monospace' }}>{profileData?.referral_code || '---'}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(profileData?.referral_code || '');
                    alert(`Code copied!`);
                  }}
                  style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700' }}
                >
                  COPY
                </button>
              </div>
            </div>
            
            {profileData?.referral_balance >= 200 && (
              <button 
                onClick={async () => {
                  const upi = prompt("Enter your UPI ID for ₹" + profileData.referral_balance + " withdrawal:");
                  if (!upi) return;
                  
                  try {
                    const res = await fetch('/api/request-withdrawal', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: user.id,
                        amount: profileData.referral_balance,
                        upiId: upi
                      })
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert("Withdrawal request submitted! Amount will be credited in 24-48 hours.");
                      window.location.reload();
                    } else {
                      alert("Error: " + data.error);
                    }
                  } catch (e) {
                    alert("Network error. Try again.");
                  }
                }}
                style={{
                  width: '100%',
                  padding: '6px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Withdraw Earnings
              </button>
            )}
          </div>


          <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '12px 16px' }}></div>

          <button className="dropdown-item" style={{ ...itemStyle, justifyContent: 'space-between' }} onClick={onToggleTheme}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="icon-wrap">{theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}</div>
              <span>Interface Theme</span>
            </div>
            <div style={{ width: '40px', height: '22px', background: theme === 'dark' ? '#3b82f6' : '#e2e8f0', borderRadius: '12px', position: 'relative', transition: 'all 0.3s' }}>
              <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: theme === 'dark' ? '20px' : '2px', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
            </div>
          </button>

          <button className="dropdown-item" style={itemStyle}>
            <div className="icon-wrap"><Globe size={18} /></div>
            <span>Terminal Language</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>EN</span>
          </button>

          <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '12px 16px' }}></div>

          <button className="dropdown-item signout-btn" style={{ ...itemStyle, color: '#ef4444' }} onClick={handleSignOut}>
            <div className="icon-wrap" style={{ background: '#fef2f2' }}><LogOut size={18} /></div>
            <span style={{ fontWeight: '600' }}>Terminate Session</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes revealDropdown {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          background: none;
          border: none;
          color: #475569;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .dropdown-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .icon-wrap {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          border-radius: 8px;
          color: #64748b;
        }
        .dropdown-item:hover .icon-wrap {
          background: white;
          color: #3b82f6;
          box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }
        .signout-btn:hover .icon-wrap {
          color: #ef4444;
          background: #fff1f2;
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
  padding: '10px 20px',
  background: 'none',
  border: 'none',
  color: '#475569',
  fontSize: '0.9rem',
  cursor: 'pointer',
  textAlign: 'left',
};
