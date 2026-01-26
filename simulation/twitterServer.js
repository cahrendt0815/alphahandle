/**
 * Twitter Proxy Server
 * Provides endpoints to fetch tweets from Twitter using full pagination
 * Runs on port 8001 to match the MARKET_BASE_URL in .env
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { fetchTweetsWithLimit } = require('./analysisServer');

// Load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = 8001;

// Twitter API key from environment
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || process.env.TW_BEARER;

if (!TWITTER_API_KEY) {
  console.error('[TwitterServer] ❌ TWITTER_API_KEY not found in environment');
  process.exit(1);
}

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Simple in-memory cache
const CACHE_TTL_MS = 60 * 1000;
const responseCache = new Map(); // key -> { data, t }

/**
 * GET /api/tweets/search
 * Validates input, checks cache, forwards to twitterapi.io via fetchTweetsWithLimit,
 * enforces a 20s overall timeout, and returns structured JSON.
 */
app.get('/api/tweets/search', async (req, res) => {
  const { query, queryType = 'Latest' } = req.query || {};

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const cacheKey = JSON.stringify({ query, queryType });
  const cached = responseCache.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.t) < CACHE_TTL_MS) {
    console.log(`[GET /api/tweets/search] query="${query}" (cache hit)`);
    return res.json(cached.data);
  }

  console.log(`[GET /api/tweets/search] query="${query}" (fresh fetch)`);

  const handlerPromise = (async () => {
    try {
      const tweets = await fetchTweetsWithLimit(query, TWITTER_API_KEY, queryType || 'Latest', 200);

      const payload = {
        tweets: Array.isArray(tweets) ? tweets : [],
        count: Array.isArray(tweets) ? tweets.length : 0,
        has_next_page: false,
        next_cursor: null
      };

      // cache it
      responseCache.set(cacheKey, { data: payload, t: now });
      return res.json(payload);
    } catch (err) {
      console.error('[TwitterServer] fetch error:', err && err.stack ? err.stack : err);
      const status = (err && err.response && err.response.status) || 500;
      const details = err && err.message ? err.message : 'Unknown error';
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: 'Failed to fetch tweets',
        details
      });
    }
  })();

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 20000));

  const outcome = await Promise.race([handlerPromise, timeoutPromise]);
  if (outcome === 'TIMEOUT') {
    console.warn('[TwitterServer] Request timed out after 20s');
    return res.status(504).json({ error: 'Request timed out' });
  }
});

// (Removed old inline fetchTweetsWithLimit; using shared implementation)

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'twitter-proxy',
    port: PORT,
    apiKey: TWITTER_API_KEY ? 'configured' : 'missing'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n✅ Twitter Proxy Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/tweets/search?query=...&queryType=Latest`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`🔑 Twitter API Key: ${TWITTER_API_KEY ? 'Configured ✅' : 'Missing ❌'}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[TwitterServer] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[TwitterServer] Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
