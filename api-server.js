import http from 'http';
import { parse } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = parse(req.url, true);
  const { pathname, query } = parsedUrl;

    if (pathname.startsWith('/api/')) {
    const apiName = pathname.replace('/api/', '').split('?')[0];
    const filePath = join(__dirname, 'api', `${apiName.endsWith('.js') ? apiName : apiName + '.js'}`);

    if (fs.existsSync(filePath)) {
      // Accumulate body if POST
      let rawBody = '';
      if (req.method === 'POST') {
        for await (const chunk of req) {
          rawBody += chunk;
        }
      }

      try {
        const module = await import(`file://${filePath.replace(/\\/g, '/')}?update=${Date.now()}`);
        const handler = module.default;
        
        let body = {};
        if (rawBody) {
          try { body = JSON.parse(rawBody); } catch (e) { console.error('Failed to parse body', e); }
        }

        const mockReq = { 
          query, 
          headers: req.headers, 
          body: body,
          url: req.url,
          method: req.method,
          // Support for manual stream reading in handlers
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(rawBody);
          }
        };

        const mockRes = {
          status: (code) => { res.statusCode = code; return mockRes; },
          json: (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return mockRes;
          },
          setHeader: (name, value) => { res.setHeader(name, value); return mockRes; },
          send: (data) => { res.end(data); return mockRes; }
        };

        return handler(mockReq, mockRes);
      } catch (err) {
        console.error(`API Error in ${apiName}:`, err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    } else {
      console.warn(`API file not found: ${filePath}`);
      res.statusCode = 404;
      res.end(JSON.stringify({ error: `Not Found: ${apiName}` }));
    }
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 AlphaVision API Dev Server running at http://localhost:${PORT}`);
  console.log(`📡 Vite proxy configured to route /api -> http://localhost:${PORT}\n`);
});
