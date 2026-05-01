import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, CheckCircle } from 'lucide-react';
import './Auth.css';

export default function Paywall({ userEmail, isNewRegistration }) {
  const [plan, setPlan] = useState('monthly');
  
  const UPI_ID = 'meetraste1511@okaxis'; 
  const SUPPORT_EMAIL = 'meetraste1511@gmail.com';
  
  const plans = {
    monthly: { amount: 1199, label: '1 Month', desc: '₹1,199 / month' },
    quarterly: { amount: 3000, label: '3 Months', desc: '₹3,000 Total (Save ₹597)' }
  };
  
  const currentAmount = plans[plan].amount;
  
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=AlphaVision&am=${currentAmount}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px' }}>
        
        {isNewRegistration && (
          <div style={{ background: '#ecfdf5', color: '#059669', padding: '14px', borderRadius: '12px', marginBottom: '32px', border: '1px solid #a7f3d0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <CheckCircle size={18} />
            <strong>Registration successful! Complete your payment to unlock.</strong>
          </div>
        )}

        <div className="auth-header">
          <div style={{ display: 'inline-flex', background: '#eff6ff', padding: '16px', borderRadius: '50%', marginBottom: '20px' }}>
            <Lock size={32} color="#2563eb" />
          </div>
          <h2>Subscription Required</h2>
          <p className="auth-subtitle" style={{ marginTop: '8px' }}>
            Choose an institutional plan to unlock AlphaVision Terminal.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '32px' }}>
          {Object.entries(plans).map(([key, data]) => (
            <div 
              key={key}
              onClick={() => setPlan(key)}
              style={{
                flex: 1,
                padding: '20px 16px',
                border: plan === key ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: '16px',
                cursor: 'pointer',
                background: plan === key ? '#eff6ff' : '#ffffff',
                transition: 'all 0.2s ease',
                position: 'relative',
                boxShadow: plan === key ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none'
              }}
            >
              {key === 'quarterly' && <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>BEST VALUE</div>}
              <div style={{ fontWeight: '800', fontSize: '1.15rem', color: plan === key ? '#1e40af' : '#1e293b' }}>{data.label}</div>
              <div style={{ fontSize: '0.85rem', color: plan === key ? '#3b82f6' : '#64748b', marginTop: '6px', fontWeight: '500' }}>{data.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#f8fafc', padding: '32px 24px', borderRadius: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '2.2rem', color: '#0f172a', marginBottom: '24px', fontWeight: '800' }}>
            ₹{currentAmount.toLocaleString()}
          </h3>
          
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '24px' }}>
            <img 
              src={qrCodeUrl} 
              alt="UPI QR Code" 
              style={{ width: '180px', height: '180px', display: 'block' }}
            />
          </div>
          
          <div>
            <span style={{ fontFamily: 'monospace', fontSize: '1.05rem', background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', display: 'inline-block', fontWeight: '600' }}>
              {UPI_ID}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'left', background: '#f8fafc', padding: '24px', borderRadius: '16px', borderLeft: '4px solid #2563eb' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b', fontSize: '0.95rem' }}>
            <ShieldCheck size={18} color="#2563eb"/> Secure Activation
          </h4>
          <ol style={{ paddingLeft: '24px', fontSize: '0.85rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>Scan the QR code to securely pay <strong>₹{currentAmount.toLocaleString()}</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Take a screenshot of the successful payment.</li>
            <li style={{ marginBottom: '8px' }}>Email the screenshot to <strong>{SUPPORT_EMAIL}</strong> from your registered email.</li>
            <li>Your institutional terminal access will be unlocked within 2 hours.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
