import https from 'https';

export default async function handler(req, res) {
  // CORS headers
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

  console.log('API: Creating Razorpay order...');

  try {
    const { amount, receipt } = req.body;
    
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('API Error: Missing Razorpay credentials in environment');
      return res.status(500).json({ error: 'Configuration Error', details: 'Razorpay Key ID or Secret is missing in server environment variables.' });
    }

    const orderPayload = JSON.stringify({
      amount: amount * 100,
      currency: 'INR',
      receipt: receipt || `receipt_${Date.now()}`
    });

    const options = {
      hostname: 'api.razorpay.com',
      path: '/v1/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Length': orderPayload.length
      }
    };

    return new Promise((resolve) => {
      const razorReq = https.request(options, (razorRes) => {
        let data = '';
        razorRes.on('data', (chunk) => { data += chunk; });
        razorRes.on('end', () => {
          if (razorRes.statusCode >= 200 && razorRes.statusCode < 300) {
            console.log('API: Razorpay order created successfully');
            res.status(200).json(JSON.parse(data));
          } else {
            console.error('API Error: Razorpay returned status', razorRes.statusCode, data);
            res.status(razorRes.statusCode).json({ error: 'Razorpay API Error', details: data });
          }
          resolve();
        });
      });

      razorReq.on('error', (e) => {
        console.error('API Error: Connection to Razorpay failed', e);
        res.status(500).json({ error: 'Connection Error', details: e.message });
        resolve();
      });

      razorReq.write(orderPayload);
      razorReq.end();
    });

  } catch (error) {
    console.error('API Error: Internal server error', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
