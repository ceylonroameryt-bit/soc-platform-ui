import Parser from 'rss-parser';

const parser = new Parser();

// Cybersecurity RSS Feeds
const RSS_FEEDS = [
    'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    'https://www.us-cert.gov/ncas/current-activity.xml',
    'https://www.bleepingcomputer.com/feed/',
    'https://feeds.feedburner.com/TheHackersNews',
    'https://krebsonsecurity.com/feed/',
    'https://threatpost.com/feed/'
];

// Severity detection keywords
const SEVERITY_KEYWORDS = {
    critical: ['zero-day', 'rce', 'remote code execution', 'critical', 'exploit', 'unpatched', 'active exploitation'],
    high: ['ransomware', 'breach', 'leak', 'vulnerability', 'attack', 'malware', 'backdoor', 'trojan', 'apt'],
    medium: ['patch', 'update', 'warning', 'advisory', 'phishing', 'scam', 'botnet', 'ddos']
};

function determineSeverity(title, snippet = '') {
    const text = `${title} ${snippet}`.toLowerCase();
    if (SEVERITY_KEYWORDS.critical.some(k => text.includes(k))) return 'critical';
    if (SEVERITY_KEYWORDS.high.some(k => text.includes(k))) return 'high';
    if (SEVERITY_KEYWORDS.medium.some(k => text.includes(k))) return 'medium';
    return 'low';
}

async function fetchNews() {
    try {
        // Fetch first 2 feeds only (to avoid timeout in serverless)
        const feeds = RSS_FEEDS.slice(0, 2);
        const promises = feeds.map(feed =>
            parser.parseURL(feed).catch(err => {
                console.error(`Failed to fetch ${feed}:`, err.message);
                return null;
            })
        );

        const results = await Promise.all(promises);
        const validFeeds = results.filter(f => f !== null);

        const news = [];
        validFeeds.forEach(feed => {
            feed.items.slice(0, 10).forEach(item => { // Limit to 10 items per feed
                const severity = determineSeverity(item.title, item.contentSnippet || '');
                news.push({
                    id: news.length + 1,
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate || new Date().toISOString(),
                    description: item.contentSnippet || '',
                    source: feed.title || 'Unknown',
                    severity: severity
                });
            });
        });

        // Sort by date (newest first)
        news.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        return news;
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

// Vercel serverless handler
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

    // News endpoint - fetch real RSS feeds
    if (path === '/api/news') {
        // Disable caching for debugging
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

        const news = await fetchNews();

        // Fallback to mock data if RSS fetch fails
        if (news.length === 0) {
            console.log('RSS fetch failed, returning mock data');
            return res.json({
                news: [
                    {
                        id: 1,
                        title: '[MOCK] RSS Feeds Unavailable -' + new Date().toISOString(),
                        source: 'System',
                        severity: 'medium',
                        pubDate: new Date().toISOString(),
                        description: 'Real RSS feeds could not be fetched. This is mock data.',
                        link: '#'
                    }
                ]
            });
        }

        return res.json({ news });
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
