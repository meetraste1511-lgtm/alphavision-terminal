import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Add CORS headers for local testing
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, userEmail, planAmount, referralCode } = req.body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    // Verify signature cryptographically
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.error('Signature mismatch', { expected: generated_signature, received: razorpay_signature });
      return res.status(400).json({ error: 'Invalid Payment Signature' });
    }

    // Connect to Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- 🤝 REFERRAL SYSTEM LOGIC ---
    let referrerId = null;
    if (referralCode) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id, referral_balance')
        .eq('referral_code', referralCode)
        .single();
      
      if (referrer && referrer.id !== userId) {
        referrerId = referrer.id;
        const newBalance = (referrer.referral_balance || 0) + 200;
        await supabase
          .from('profiles')
          .update({ referral_balance: newBalance })
          .eq('id', referrerId);
        
        // Log referral transaction
        await supabase.from('referral_logs').insert({
          referrer_id: referrerId,
          referred_user_id: userId,
          amount: 200,
          payment_id: razorpay_payment_id
        });
      }
    }

    // Fetch current profile to check for existing subscription
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('subscription_expiry_date')
      .eq('id', userId)
      .single();

    const currentExpiry = existingProfile?.subscription_expiry_date ? new Date(existingProfile.subscription_expiry_date) : null;
    const now = new Date();

    // Calculate new expiry (Cumulative: Add to existing if valid, otherwise add to Now)
    const daysToAdd = planAmount >= 3000 ? 90 : 30;
    let expiryDate = new Date();

    if (currentExpiry && currentExpiry > now) {
      // Extension logic: Add to existing expiry
      expiryDate = new Date(currentExpiry);
      expiryDate.setDate(expiryDate.getDate() + daysToAdd);
      console.log(`Extending existing subscription. New expiry: ${expiryDate.toISOString()}`);
    } else {
      // New/Expired logic: Add to Now
      expiryDate.setDate(now.getDate() + daysToAdd);
      console.log(`New/Renewed subscription. Expiry: ${expiryDate.toISOString()}`);
    }

    // Update user profile in Supabase (UPSERT to handle new users)
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        email: userEmail,
        subscription_expiry_date: expiryDate.toISOString(),
        referred_by: referralCode || null
      }, { onConflict: 'id' });

    if (profileErr) {
       console.error('Failed to update Supabase profile:', profileErr);
    }

    // 🚀 AUTOMATION: Force confirm email in Supabase Auth since they just paid
    try {
      await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
      console.log('User email auto-confirmed via payment.');
    } catch (authErr) {
      console.warn('Auto-confirm failed (might be missing admin permissions):', authErr.message);
    }

    return res.status(200).json({ success: true, expiry: expiryDate.toISOString() });

  } catch (error) {
    console.error('Server error verifying payment:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
