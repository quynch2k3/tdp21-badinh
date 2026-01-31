const http = require('http');
const https = require('https');

const PORT = 3000;
// SANDBOX Environment (use 'test-payment.momo.vn' for sandbox credentials)
const MOMO_HOST = 'test-payment.momo.vn';
const MOMO_PATH = '/v2/gateway/api/create';

const server = http.createServer((req, res) => {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Only POST allowed');
        return;
    }

    console.log(`[Proxy] Forwarding request to ${MOMO_HOST}...`);

    // 2. Forward to MoMo
    const options = {
        hostname: MOMO_HOST,
        port: 443,
        path: MOMO_PATH,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': req.headers['content-length'] || 0
        }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        // Forward headers and status
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    // 3. Pipe body from client to MoMo
    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (e) => {
        console.error("[Proxy Error]", e);
        res.writeHead(500);
        res.end(JSON.stringify({ message: "Proxy Error: " + e.message }));
    });
});

server.listen(PORT, () => {
    console.log(`\n================================`);
    console.log(` LOCAL PROXY RUNNING ON PORT ${PORT}`);
    console.log(` Bridge to: https://${MOMO_HOST}${MOMO_PATH}`);
    console.log(`================================\n`);
});
