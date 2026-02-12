import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cron from 'node-cron';

// Route imports
import newsRouter from './routes/news.js';
import threatsRouter from './routes/threats.js';
import reportsRouter from './routes/reports.js';
import sourcesRouter from './routes/sources.js';

// Service imports
import { fetchAndProcessNews } from './services/newsService.js';
import { sendPeriodicSummary } from './services/emailService.js';

// ES module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// 1. Compression
app.use(compression());

// 2. Helmet - Security Headers (CSP temporarily disabled for Azure debugging)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
}));

// 3. Custom Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.removeHeader('X-Powered-By');
    next();
});

// 4. CORS - Strict Origin Allowlist
const allowedOrigins = [
    'http://localhost:5173',   // Vite dev server
    'http://localhost:3000',   // Server itself
    process.env.ALLOWED_ORIGIN // Production domain from .env
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS blocked request from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // Cache preflight for 24 hours
}));

// 5. Body Parser with Size Limit (prevent payload bombs)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// 6. Rate Limiting - Tiered
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,  // Return rate limit info in headers
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown'
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Very strict for sensitive endpoints
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded for this action.' }
});

app.use('/api', apiLimiter);

// 7. Request Logging (Security Audit Trail)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path.startsWith('/api')) {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms - ${req.ip}`);
        }
    });
    next();
});

// ==========================================
// STATIC FILES (production)
// ==========================================
// Use process.cwd() for reliability on Azure iisnode (where __dirname may differ)
const distPath = path.join(process.cwd(), 'dist');
const distPathAlt = path.join(__dirname, '../dist');
const resolvedDistPath = fs.existsSync(distPath) ? distPath : distPathAlt;
console.log(`[STATIC] Serving from: ${resolvedDistPath} (exists: ${fs.existsSync(resolvedDistPath)})`);

app.use(express.static(resolvedDistPath, {
    dotfiles: 'deny',
    etag: true,
    maxAge: 0,              // No cache during debugging
    index: false,
    setHeaders: (res, filePath) => {
        // Ensure correct MIME types
        if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');  // Disable cache during debugging
    }
}));

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/news', newsRouter);
app.use('/api/threats', threatsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/sources', sourcesRouter);

// Debug endpoint - shows file paths on Azure (remove after debugging)
app.get('/api/debug/paths', (req, res) => {
    const distFiles = fs.existsSync(resolvedDistPath) ? fs.readdirSync(resolvedDistPath) : [];
    const assetsPath = path.join(resolvedDistPath, 'assets');
    const assetFiles = fs.existsSync(assetsPath) ? fs.readdirSync(assetsPath) : [];
    res.json({
        cwd: process.cwd(),
        __dirname,
        distPath: resolvedDistPath,
        distExists: fs.existsSync(resolvedDistPath),
        distFiles,
        assetFiles,
        nodeVersion: process.version,
        env: process.env.NODE_ENV || 'not set'
    });
});

// Manual Email Trigger (with strict rate limit + input validation)
app.post('/api/notifications/send', strictLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const targetEmail = email || process.env.DEFAULT_EMAIL || 'poornasujampathi@gmail.com';

        // Email validation regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address format.' });
        }

        console.log(`[EMAIL] Sending report to ${targetEmail}...`);
        const result = await sendPeriodicSummary(targetEmail);

        if (result.success) {
            res.json({ success: true, message: 'Report sent successfully.' });
        } else {
            // Don't leak internal error details to client
            res.status(500).json({ success: false, error: 'Failed to send email. Try again later.' });
        }
    } catch (err) {
        console.error('[EMAIL ERROR]', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

// ==========================================
// CATCH-ALL FOR REACT SPA (must be last)
// ==========================================
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ==========================================
// GLOBAL ERROR HANDLER (prevents stack trace leaks)
// ==========================================
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed.' });
    }

    // JSON parse errors
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request payload too large.' });
    }

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Malformed JSON in request body.' });
    }

    // Generic error (never leak stack traces in production)
    res.status(err.status || 500).json({
        error: isDev ? err.message : 'Internal server error.'
    });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`\n🔒 SOC Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    console.log(`   CORS Origins: ${allowedOrigins.join(', ')}`);
    console.log(`   Rate Limit: 500 req/15min (API), 10 req/15min (Email)\n`);

    // Initial data fetch
    fetchAndProcessNews();

    // Schedule email every 3 hours
    const reportEmail = process.env.DEFAULT_EMAIL || 'poornasujampathi@gmail.com';
    cron.schedule('0 */3 * * *', () => {
        console.log(`[CRON] Running periodic email report...`);
        sendPeriodicSummary(reportEmail);
    });

    // Refresh news every 30 minutes
    setInterval(fetchAndProcessNews, 30 * 60 * 1000);
});
