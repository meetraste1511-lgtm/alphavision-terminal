import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, ShieldCheck, LogOut, X, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Profile({ session, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (data) setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar-circle" style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <User size={20} />
            </div>
            <h3>Researcher Profile</h3>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="profile-body" style={{ padding: '24px 0' }}>
          <div className="profile-info-item" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Email Address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', color: 'var(--text-primary)' }}>
              <Mail size={16} color="var(--accent-color)" />
              {session.user.email}
            </div>
          </div>

          <div className="profile-info-item" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Subscription Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', color: '#10b981' }}>
              <ShieldCheck size={16} color="#10b981" />
              Institutional Active
            </div>
          </div>

          <div className="profile-info-item" style={{ marginBottom: '32px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Research Expiry</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', color: 'var(--text-primary)' }}>
              <Calendar size={16} color="var(--accent-color)" />
              {profile?.subscription_expiry_date 
                ? new Date(profile.subscription_expiry_date).toLocaleDateString() 
                : 'Permanent Access'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--surface-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Zap size={14} color="var(--accent-color)" />
              Intelligence Tier: Alpha Terminal
            </div>
          </div>

          <button 
            onClick={handleSignOut}
            className="btn-secondary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ef4444', borderColor: '#fee2e2' }}
          >
            <LogOut size={18} />
            Sign Out of Terminal
          </button>
        </div>
      </div>
    </div>
  );
}
