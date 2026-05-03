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
          top: '64px', 
          right: '24px', 
          width: '320px', 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(20px)',
          borderRadius: '20px', 
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)', 
          border: '1px solid rgba(255,255,255,0.2)',
          overflow: 'hidden',
          animation: 'revealDropdown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          color: '#1e293b'
        }}
      >
        {/* Institutional Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            {displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" style={{ width: '52px', height: '52px', borderRadius: '16px', border: '2px solid #3b82f6' }} />
            ) : (
              <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.4rem', border: '2px solid white', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '16px', height: '16px', background: '#10b981', border: '3px solid white', borderRadius: '50%' }}></div>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
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
 
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="icon-wrap"><UserPlus size={18} /></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '600' }}>Referral Network</span>
                  {profileData?.referral_code && (
                    <span 
                      style={{ fontSize: '0.65rem', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => {
                        navigator.clipboard.writeText(profileData.referral_code);
                        alert(`Code ${profileData.referral_code} copied!`);
                      }}
                    >
                      Copy: {profileData.referral_code}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#10b981' }}>₹{profileData?.referral_balance || 0}</span>
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
