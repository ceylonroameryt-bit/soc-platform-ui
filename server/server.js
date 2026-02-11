import express from 'express';
import cors from 'cors';
import newsRouter from './routes/news.js';
import threatsRouter from './routes/threats.js';
import reportsRouter from './routes/reports.js';
import sourcesRouter from './routes/sources.js';
import { fetchAndProcessNews } from './services/newsService.js';
import cron from 'node-cron';
import { sendPeriodicSummary } from './services/emailService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

// Get __dirname equivalent in ES modules
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(compression()); // Compress all responses
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for now to avoid React inline script issues
}));

// Rate Limiting: 100 requests per 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

app.use(cors({
    origin: '*', // Allow all origins for production (or configure specific domain)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Serve Static Files (React Frontend)
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/news', newsRouter);
app.use('/api/threats', threatsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/sources', sourcesRouter);

// Catch-All Route for React (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Email Service & Scheduler
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);

    // Initial fetch
    fetchAndProcessNews();

    // Manual Trigger Route
    app.post('/api/notifications/send', async (req, res) => {
        const { email } = req.body;
        const targetEmail = email || 'poornasujampathi@gmail.com';

        console.log(`Sending manual email report to ${targetEmail}...`);
        const result = await sendPeriodicSummary(targetEmail);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    });

    // Schedule Periodic Report (Every 3 Hours)
    cron.schedule('0 */3 * * *', () => {
        console.log('Running periodic email report job (Every 3 Hours)...');
        sendPeriodicSummary('poornasujampathi@gmail.com');
    });

    // Refresh every 30 minutes
    setInterval(fetchAndProcessNews, 30 * 60 * 1000);
});
