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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planAmount } = req.body;

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

    // Calculate new expiry (30 days for 1199, 90 days for 3000)
    const daysToAdd = planAmount >= 3000 ? 90 : 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysToAdd);

    // Update user profile in Supabase
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .update({ subscription_expiry_date: expiryDate.toISOString() })
      .eq('id', userId);

    if (profileErr) {
       console.error('Failed to update Supabase profile:', profileErr);
       return res.status(200).json({ success: true, warning: 'Payment succeeded but failed to update profile automatically. Admin check required.', error: profileErr });
    }

    return res.status(200).json({ success: true, expiry: expiryDate.toISOString() });

  } catch (error) {
    console.error('Server error verifying payment:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
