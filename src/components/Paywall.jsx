import React, { useState } from 'react';
import { Lock, ShieldCheck, CheckCircle, RefreshCcw, Zap } from 'lucide-react';
import './Auth.css';

export default function Paywall({ userEmail, userId, isNewRegistration }) {
  const [plan, setPlan] = useState('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');
  
  const plans = {
    monthly: { amount: 1199, label: '1 Month', desc: '₹1,199 / month' },
    quarterly: { amount: 3000, label: '3 Months', desc: '₹3,000 Total (Save ₹597)' }
  };
  
  const currentAmount = plans[plan].amount;

  const handlePayment = async () => {
    setStatus('Initializing secure connection...');
    setIsProcessing(true);
    
    try {
      console.log('API Request: Creating order...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: currentAmount }),
        signal: controller.signal
      }).catch(err => {
        if (err.name === 'AbortError') throw new Error('The secure server took too long to respond. Please try again.');
        throw err;
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server Error (${res.status}): ${errorText}`);
      }

      const order = await res.json();
      if (!order.id) throw new Error('Server did not return a valid Order ID.');

      setStatus('Order created! Opening secure popup...');

      if (!window.Razorpay) {
        throw new Error('Payment gateway library failed to load. Please refresh the page.');
      }

      const options = {
        key: 'rzp_live_Sk9c7D3csrStLq', 
        amount: order.amount,
        currency: order.currency,
        name: "AlphaVision Terminal",
        description: "Institutional SaaS Subscription",
        order_id: order.id,
        handler: async function (response) {
          setStatus('Payment success! Verifying...');
          try {
             const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                   razorpay_order_id: response.razorpay_order_id,
                   razorpay_payment_id: response.razorpay_payment_id,
                   razorpay_signature: response.razorpay_signature,
                   userId: userId,
                   userEmail: userEmail,
                   planAmount: currentAmount
                })
             });
             const verifyData = await verifyRes.json();
             if (verifyData.success) {
                setStatus('Account Unlocked! Refreshing...');
                alert("SUCCESS: Your account is now active.");
                window.location.reload();
             } else {
                setStatus('Verification failed. Contact support.');
                alert("Error: " + (verifyData.error || 'Verification failed'));
             }
          } catch(e) {
             setStatus('Network error during verification.');
          }
        },
        prefill: { email: userEmail },
        theme: { color: "#2563eb" },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setStatus('');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment Error:', error);
      setStatus('Error: ' + error.message);
      alert('Payment Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-logo">
            <Zap size={32} color="#2563eb" fill="#2563eb" />
            <h1>AlphaVision</h1>
          </div>
          
          <h2>Activate your <span>institutional access</span></h2>
          <p>
            Complete your subscription to unlock the full power of AlphaVision. 
            Get real-time signals, AI-driven research, and institutional-grade tools.
          </p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> Full Terminal Access
            </div>
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> Priority Signal Feed
            </div>
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> Unlimited AI Analysis
            </div>
            <div className="auth-feature-item">
              <CheckCircle size={20} color="#10b981" /> 24/7 Market Support
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          {isNewRegistration && (
            <div className="auth-success" style={{ marginBottom: '32px' }}>
              <strong>Registration successful!</strong><br/>
              Choose a plan to unlock your terminal.
            </div>
          )}

          <div className="auth-header">
            <h2>Select Plan</h2>
            <p className="auth-subtitle">
              Choose the subscription that fits your trading style.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            {Object.entries(plans).map(([key, data]) => (
              <div 
                key={key}
                onClick={() => setPlan(key)}
                style={{
                  padding: '24px',
                  border: plan === key ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  background: plan === key ? '#f0f9ff' : '#ffffff',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {key === 'quarterly' && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#10b981', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px' }}>SAVINGS</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div>
                      <div style={{ fontWeight: '800', fontSize: '1.2rem', color: plan === key ? '#1e40af' : '#1e293b' }}>{data.label}</div>
                      <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>{data.desc}</div>
                   </div>
                   {plan === key && <CheckCircle size={24} color="#2563eb" fill="#eff6ff" />}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '24px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
               <span style={{ color: '#64748b', fontWeight: '600' }}>Total Amount:</span>
               <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>₹{currentAmount.toLocaleString()}</span>
            </div>
            
            <button 
              onClick={handlePayment} 
              className="auth-submit-btn"
              disabled={isProcessing}
            >
              {isProcessing ? <RefreshCcw className="spin" size={20} /> : 'Proceed to Secure Payment'}
            </button>

            {status && (
              <div style={{ marginTop: '16px', fontSize: '0.9rem', color: '#2563eb', fontWeight: '600', textAlign: 'center' }}>
                {status}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'left', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#1e293b', fontSize: '0.9rem' }}>
              <ShieldCheck size={18} color="#2563eb"/> Secure Checkout
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>
              Powered by Razorpay. Your transaction is encrypted and protected by institutional-grade security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
