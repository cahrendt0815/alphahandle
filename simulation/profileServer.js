/**
 * Profile API Server
 * Proxies Twitter profile requests to avoid CORS issues
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

// Import cache functions
const { shouldFetchTweets, updateCache, getCacheMetadata } = require('./tweetCache');

const app = express();
const PORT = 8001;

// Enable CORS for all origins (for local development)
app.use(cors());
app.use(express.json());

// Get Twitter API key from environment
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || 'new1_080d8c24606a4c4f9e3ccc2023c9f50a';

/**
 * GET /api/profile/:handle
 * Fetch Twitter profile for a given handle
 */
app.get('/api/profile/:handle', async (req, res) => {
  const { handle } = req.params;
  const cleanHandle = handle.replace('@', '');

  console.log(`[ProfileServer] Fetching profile for: ${cleanHandle}`);

  try {
    const response = await axios.get(
      `https://api.twitterapi.io/v1/user/by/username/${cleanHandle}`,
      {
        headers: {
          'x-api-key': TWITTER_API_KEY
        },
        timeout: 10000
      }
    );

    const data = response.data;

    // Extract relevant profile data
    const profile = {
      imageUrl: data.profile_image_url || data.profile_image_url_https,
      name: data.name,
      username: data.username,
      verified: data.verified || false
    };

    console.log(`[ProfileServer] ✅ Profile found for ${cleanHandle}`);
    res.json(profile);

  } catch (error) {
    console.error(`[ProfileServer] ❌ Error fetching profile for ${cleanHandle}:`, error.message);

    // Return fallback profile
    res.json({
      imageUrl: `https://ui-avatars.com/api/?name=${cleanHandle}&size=128&background=635BFF&color=fff&bold=true`,
      name: cleanHandle,
      username: cleanHandle,
      verified: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'profile-server',
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ Profile API Server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/profile/:handle\n`);
});

// Circuit breaker configuration
const CIRCUIT_BREAKER = {
  maxCostPerMinute: 5.0, // Max $5 per minute
  costPerTweet: 0.00015, // $0.15 per 1000 tweets
  tweetsPerPage: 20,
  currentMinuteCost: 0,
  lastResetTime: Date.now()
};

/**
 * Check and update circuit breaker
 * Returns true if request is allowed, false if circuit is open
 */
function checkCircuitBreaker(estimatedTweets) {
  const now = Date.now();
  const minutesSinceReset = (now - CIRCUIT_BREAKER.lastResetTime) / 60000;

  // Reset counter every minute
  if (minutesSinceReset >= 1) {
    CIRCUIT_BREAKER.currentMinuteCost = 0;
    CIRCUIT_BREAKER.lastResetTime = now;
  }

  const estimatedCost = estimatedTweets * CIRCUIT_BREAKER.costPerTweet;
  const projectedCost = CIRCUIT_BREAKER.currentMinuteCost + estimatedCost;

  if (projectedCost > CIRCUIT_BREAKER.maxCostPerMinute) {
    console.warn(`[CircuitBreaker] ⚠️ OPEN - Would exceed cost limit: $${projectedCost.toFixed(4)} > $${CIRCUIT_BREAKER.maxCostPerMinute}`);
    return false;
  }

  CIRCUIT_BREAKER.currentMinuteCost = projectedCost;
  console.log(`[CircuitBreaker] ✅ Allowed - Current minute cost: $${CIRCUIT_BREAKER.currentMinuteCost.toFixed(4)}`);
  return true;
}

/**
 * Fetch a single page of tweets
 */
async function fetchTweetPage(query, queryType, cursor = null) {
  const params = { query, queryType };
  if (cursor) {
    params.cursor = cursor;
  }

  const response = await axios.get(
    'https://api.twitterapi.io/twitter/tweet/advanced_search',
    {
      params,
      headers: { 'x-api-key': TWITTER_API_KEY },
      timeout: 10000
    }
  );

  return response.data;
}

/**
 * GET /api/tweets/search
 * Search tweets with custom query
 * Fetches up to 5 pages with circuit breaker protection
 */
app.get('/api/tweets/search', async (req, res) => {
  const { query, queryType = 'Latest' } = req.query;
  const MAX_PAGES = 2; // Fetch 2 pages = ~40 tweets (prevents frontend freeze)

  console.log(`[ProfileServer] Searching tweets: "${query}" (max ${MAX_PAGES} pages)`);

  try {
    // Check circuit breaker before starting
    const estimatedTweets = MAX_PAGES * CIRCUIT_BREAKER.tweetsPerPage;
    if (!checkCircuitBreaker(estimatedTweets)) {
      return res.status(429).json({
        error: 'Rate limit exceeded - circuit breaker open',
        tweets: [],
        costLimitReached: true
      });
    }

    const allTweets = [];
    const seenIds = new Set();
    let cursor = null;
    let totalPages = 0;

    // Fetch pages sequentially (Twitter pagination requires sequential fetching)
    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await fetchTweetPage(query, queryType, cursor);

      const tweets = data.tweets || [];
      const hasNextPage = data.has_next_page || false;
      cursor = data.next_cursor || null;

      // Deduplicate and add new tweets
      const newTweets = tweets.filter(tweet => {
        if (!tweet || !tweet.id || seenIds.has(tweet.id)) return false;
        seenIds.add(tweet.id);
        return true;
      });

      allTweets.push(...newTweets);
      totalPages++;

      console.log(`[ProfileServer] Page ${page + 1}: ${newTweets.length} new tweets (${allTweets.length} total)`);

      // Stop if no more pages or no cursor
      if (!hasNextPage || !cursor) {
        break;
      }
    }

    const finalCost = allTweets.length * CIRCUIT_BREAKER.costPerTweet;
    console.log(`[ProfileServer] ✅ Search complete: ${allTweets.length} tweets, ${totalPages} pages, cost: $${finalCost.toFixed(4)}`);

    res.json({
      tweets: allTweets,
      total_count: allTweets.length,
      pages_fetched: totalPages,
      cost: finalCost,
      has_next_page: false
    });

  } catch (error) {
    console.error(`[ProfileServer] Error searching tweets:`, error.message);
    if (error.response) {
      console.error(`[ProfileServer] Error status: ${error.response.status}`);
      console.error(`[ProfileServer] Error data:`, error.response.data);
    }
    res.status(error.response?.status || 500).json({
      error: error.message,
      tweets: []
    });
  }
});

/**
 * Load cached tweets for a handle
 */
function loadCachedTweets(handle) {
  const cacheDir = path.join(__dirname, '../out/tweet_data');
  const cacheFile = path.join(cacheDir, `${handle.toLowerCase()}.json`);

  if (!fs.existsSync(cacheFile)) {
    return null;
  }

  try {
    const data = fs.readFileSync(cacheFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`[ProfileServer] Error reading cached tweets for ${handle}:`, error.message);
    return null;
  }
}

/**
 * Save tweets to cache
 */
function saveCachedTweets(handle, data) {
  const cacheDir = path.join(__dirname, '../out/tweet_data');

  // Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const cacheFile = path.join(cacheDir, `${handle.toLowerCase()}.json`);

  try {
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn(`[ProfileServer] Error saving cached tweets for ${handle}:`, error.message);
  }
}

