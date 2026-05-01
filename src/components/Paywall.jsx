import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, CheckCircle, RefreshCcw } from 'lucide-react';
import './Auth.css';

export default function Paywall({ userEmail, userId, isNewRegistration }) {
  const [plan, setPlan] = useState('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const SUPPORT_EMAIL = 'meetraste1511@gmail.com';
  
  const plans = {
    monthly: { amount: 1199, label: '1 Month', desc: '₹1,199 / month' },
    quarterly: { amount: 3000, label: '3 Months', desc: '₹3,000 Total (Save ₹597)' }
  };
  
  const currentAmount = plans[plan].amount;

  useEffect(() => {
    console.log('Loading Razorpay script...');
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => console.log('Razorpay script loaded successfully.');
    script.onerror = () => console.error('Failed to load Razorpay script.');
    document.body.appendChild(script);
    return () => {
      try { document.body.removeChild(script); } catch (e) {}
    };
  }, []);

  const handlePayment = async () => {
    window.alert('Payment system starting. If no other box appears, check for popup blockers.');
    console.log('Starting payment process for amount:', currentAmount);
    setIsProcessing(true);
    try {
      // 1. Create Order on Backend
      console.log('Creating order on backend...');
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: currentAmount })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Order creation failed with status:', res.status, errorText);
        throw new Error(`Server Error (${res.status}): ${errorText}`);
      }

      const order = await res.json();
      console.log('Order created successfully:', order);
      
      if (!order.id) {
        throw new Error('Server returned a success response but no Order ID was found.');
      }

      // 2. Open Razorpay Checkout
      if (!window.Razorpay) {
        console.log('Razorpay window object not found. Attempting to reload script...');
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        throw new Error('Razorpay secure script is still loading. Please wait 5 seconds and try again.');
      }

      console.log('Opening Razorpay checkout...');
      
      let rzpKey = 'rzp_live_Sk9c7D3csrStLq';
      try {
        if (import.meta && import.meta.env && import.meta.env.VITE_RAZORPAY_KEY_ID) {
          rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        }
      } catch (e) {
        console.warn('Could not read import.meta.env, using fallback key.');
      }

      const options = {
        key: rzpKey,
        amount: order.amount,
        currency: order.currency,
        name: "AlphaVision Terminal",
        description: "Institutional SaaS Subscription",
        order_id: order.id,
        handler: async function (response) {
          console.log('Payment success response received:', response);
          // 3. Verify Payment
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
             console.log('Verification response:', verifyData);
             if (verifyData.success) {
                alert("SUCCESS: Payment verified! Your account is now unlocked. Refreshing...");
                window.location.reload();
             } else {
                alert("VERIFICATION FAILED: " + (verifyData.error || 'Unknown error'));
             }
          } catch(e) {
             console.error('Verification error:', e);
             alert("SYSTEM ERROR: Could not verify payment signature.");
          }
        },
        prefill: {
          email: userEmail
        },
        theme: {
          color: "#2563eb"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        alert('PAYMENT FAILED: ' + response.error.description);
      });
      rzp.open();
    } catch (error) {
      console.error('Detailed Payment Error:', error);
      alert("CRITICAL ERROR: " + error.message);
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
          
          <button 
            onClick={handlePayment} 
            disabled={isProcessing}
            style={{ 
              width: '100%', 
              background: '#2563eb', 
              color: 'white', 
              border: 'none', 
              padding: '16px', 
              borderRadius: '12px', 
              fontSize: '1.1rem', 
              fontWeight: '700', 
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {isProcessing ? <><RefreshCcw className="spin" size={20} /> Processing...</> : 'PAY NOW (V4 READY)'}
          </button>
        </div>

        <div style={{ textAlign: 'left', background: '#f8fafc', padding: '24px', borderRadius: '16px', borderLeft: '4px solid #2563eb' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b', fontSize: '0.95rem' }}>
            <ShieldCheck size={18} color="#2563eb"/> Automated Unlock
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
            Your payment is securely processed by Razorpay. Once successful, your institutional terminal access will be unlocked instantly and automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
