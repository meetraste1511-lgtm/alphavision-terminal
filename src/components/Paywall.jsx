import React, { useState } from 'react';
import { Lock, ShieldCheck, CheckCircle, RefreshCcw } from 'lucide-react';
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
          <p className="auth-subtitle">
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
                position: 'relative'
              }}
            >
              {key === 'quarterly' && <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 10px', borderRadius: '12px' }}>BEST VALUE</div>}
              <div style={{ fontWeight: '800', fontSize: '1.15rem' }}>{data.label}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{data.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#f8fafc', padding: '32px 24px', borderRadius: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '2.2rem', color: '#0f172a', marginBottom: '24px', fontWeight: '800' }}>
            ₹{currentAmount.toLocaleString()}
          </h3>
          
          <button 
            onClick={handlePayment} 
            style={{ 
              width: '100%', 
              background: '#2563eb', 
              color: 'white', 
              border: 'none', 
              padding: '18px', 
              borderRadius: '16px', 
              fontSize: '1.1rem', 
              fontWeight: '700', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {isProcessing ? <RefreshCcw className="spin" size={22} /> : 'Pay Securely with Razorpay'}
          </button>

          {status && (
            <div style={{ marginTop: '16px', fontSize: '0.9rem', color: '#2563eb', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <RefreshCcw size={14} className="spin" /> {status}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'left', background: '#f8fafc', padding: '24px', borderRadius: '16px', borderLeft: '4px solid #2563eb' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b', fontSize: '0.95rem' }}>
            <ShieldCheck size={18} color="#2563eb"/> Automated Unlock
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
            Your payment is securely processed by Razorpay. Once successful, your access will be unlocked instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
