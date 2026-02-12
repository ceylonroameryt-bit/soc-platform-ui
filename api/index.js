import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

// Route imports
import newsRouter from './routes/news.js';
import threatsRouter from './routes/threats.js';
import reportsRouter from './routes/reports.js';
import sourcesRouter from './routes/sources.js';

const app = express();

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

app.use(compression());

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: '*', // Allow all origins for Vercel deployment
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ==========================================
// BODY PARSING
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/news', newsRouter);
app.use('/api/threats', threatsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/sources', sourcesRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL ? 'vercel' : 'local'
    });
});

// Vercel serverless export
export default app;
