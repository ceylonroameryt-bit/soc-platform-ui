import express from 'express';
import { fetchAndProcessNews, getNews, getSeverityStats } from '../services/newsService.js';

const router = express.Router();

// Fetch fresh news (triggers update)
router.get('/', async (req, res) => {
    // In a real app, fetching might be a background job. 
    // Here we trigger it on request BUT return cached data effectively if recently updated, 
    // or just wait for the fetch. For simplicity, we wait.
    const news = await fetchAndProcessNews();
    res.json(news.slice(0, 50)); // Return top 50
});

// Get stats for chart
router.get('/stats', (req, res) => {
    const stats = getSeverityStats();
    res.json(stats);
});

export default router;
