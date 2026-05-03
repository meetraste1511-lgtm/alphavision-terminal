import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, amount, upiId } = req.body;

  if (!userId || !amount || !upiId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Fetch current balance
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('referral_balance, email')
      .eq('id', userId)
      .single();

    if (fetchErr || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const currentBalance = profile.referral_balance || 0;

    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    if (amount < 200) {
        return res.status(400).json({ error: 'Minimum withdrawal is ₹200' });
    }

    // 2. Create withdrawal request
    const { error: requestErr } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: userId,
        email: profile.email,
        amount: amount,
        upi_id: upiId,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (requestErr) {
      console.error('Withdrawal Request Error:', requestErr);
      // If table doesn't exist, we might need to handle it gracefully or log it to a different table
      // For now, assume it works if the schema is followed
      return res.status(500).json({ error: 'Failed to log request. Please contact support.' });
    }

    // 3. Deduct from balance
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ referral_balance: currentBalance - amount })
      .eq('id', userId);

    if (updateErr) {
        console.error('Balance Update Error:', updateErr);
        return res.status(500).json({ error: 'Failed to update balance' });
    }

    return res.status(200).json({ success: true, message: 'Withdrawal request submitted successfully' });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
