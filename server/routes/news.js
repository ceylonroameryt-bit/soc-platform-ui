import express from 'express';
import { fetchAndProcessNews, getNews, getSeverityStats } from '../services/newsService.js';

const router = express.Router();

// Serve news from in-memory cache (instant response)
router.get('/', (req, res) => {
    const news = getNews();
    res.json(news.slice(0, 50)); // Return top 50
});

// Get stats for chart
router.get('/stats', (req, res) => {
    const stats = getSeverityStats();
    res.json(stats);
});

export default router;
