import React from 'react';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import './Auth.css';

export default function Paywall({ userEmail }) {
  // TODO: The user will provide their actual UPI and Email later
  const UPI_ID = 'your_upi_id_here@upi'; 
  const SUPPORT_EMAIL = 'your_new_email@gmail.com';
  const AMOUNT = 999;
  
  // Generate a standard UPI payment link that most Indian banking apps recognize
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=AlphaVision&am=${AMOUNT}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <div className="auth-header">
          <Lock size={48} color="var(--accent-color)" style={{ marginBottom: '16px' }} />
          <h2>Subscription Required</h2>
          <p className="auth-subtitle" style={{ marginTop: '8px' }}>
            Your access to AlphaVision Terminal has expired or not been activated yet.
          </p>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.4rem', color: 'var(--success-color)', marginBottom: '16px' }}>
            ₹{AMOUNT} / month
          </h3>
          
          <img 
            src={qrCodeUrl} 
            alt="UPI QR Code" 
            style={{ width: '200px', height: '200px', borderRadius: '8px', border: '4px solid white', marginBottom: '16px' }}
          />
          
          <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', display: 'inline-block' }}>
            {UPI_ID}
          </p>
        </div>

        <div style={{ textAlign: 'left', background: 'rgba(41, 98, 255, 0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldCheck size={18} color="var(--accent-color)"/> Activation Instructions
          </h4>
          <ol style={{ paddingLeft: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <li>Scan the QR code above using GPay, PhonePe, or Paytm to pay ₹{AMOUNT}.</li>
            <li>Take a screenshot of the successful payment.</li>
            <li>Email the screenshot to <strong>{SUPPORT_EMAIL}</strong> from your registered email (<strong>{userEmail}</strong>).</li>
            <li>Your account will be manually unlocked within a few hours!</li>
          </ol>
        </div>

        <div className="auth-footer" style={{ marginTop: '24px' }}>
          <p>Already paid? Just refresh the page after receiving confirmation.</p>
        </div>
      </div>
    </div>
  );
}
