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
    const { amount, receipt } = req.body;
    
    // Amount is passed in INR, Razorpay expects paise (multiply by 100)
    const orderPayload = {
      amount: amount * 100,
      currency: 'INR',
      receipt: receipt || `receipt_${Date.now()}`
    };

    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('Missing Razorpay credentials');
      return res.status(500).json({ error: 'Payment gateway configuration missing' });
    }

    // Use native fetch to call Razorpay API directly (no SDK required)
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
      },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Razorpay Error:', errText);
      return res.status(response.status).json({ error: 'Failed to create order', details: errText });
    }

    const order = await response.json();
    return res.status(200).json(order);

  } catch (error) {
    console.error('Server error creating order:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
