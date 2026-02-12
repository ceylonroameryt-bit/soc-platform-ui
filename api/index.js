// Minimal Vercel serverless API handler
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    // Health check
    if (path === '/api/health') {
        return res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: 'vercel'
        });
    }

    // News endpoint
    if (path === '/api/news') {
        return res.json({
            news: [
                {
                    id: 1,
                    title: 'Critical Vulnerability in Apache Log4j',
                    source: 'CISA',
                    severity: 'critical',
                    timestamp: new Date().toISOString(),
                    description: 'Remote code execution vulnerability affecting multiple versions'
                },
                {
                    id: 2,
                    title: 'New Ransomware Campaign Targeting Healthcare',
                    source: 'FBI',
                    severity: 'high',
                    timestamp: new Date().toISOString(),
                    description: 'Sophisticated ransomware targeting medical institutions'
                },
                {
                    id: 3,
                    title: 'State-Sponsored APT Activity Detected',
                    source: 'NSA',
                    severity: 'high',
                    timestamp: new Date().toISOString(),
                    description: 'Advanced persistent threat targeting government infrastructure'
                }
            ]
        });
    }

    // Threats endpoint
    if (path === '/api/threats') {
        return res.json({
            threats: [
                { id: 1, name: 'CVE-2024-1234', severity: 'critical', status: 'active' },
                { id: 2, name: 'CVE-2024-5678', severity: 'high', status: 'mitigated' }
            ]
        });
    }

    // Default 404
    res.status(404).json({ error: 'Not found', path });
}
