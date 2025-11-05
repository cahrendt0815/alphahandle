/**
 * Twitter Proxy Server
 * Provides endpoints to fetch tweets from Twitter using full pagination
 * Runs on port 8001 to match the MARKET_BASE_URL in .env
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

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

/**
 * POST /api/tweets/search
 * Fetches tweets matching the given query with full pagination
 *
 * Query Parameters:
 * - query: Twitter search query (e.g., "from:buccocapital -is:retweet -is:reply since:2024-10-17")
 * - queryType: "Latest" or "Top"
 *
 * Response:
 * {
 *   tweets: [...],
 *   count: 123
 * }
 */
app.get('/api/tweets/search', async (req, res) => {
  try {
    const { query, queryType = 'Latest' } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Missing query parameter'
      });
    }

    console.log(`[TwitterServer] Fetching tweets for query: "${query}"`);
    console.log(`[TwitterServer] Query type: ${queryType}`);

    // Fetch tweets with a limit to avoid timeouts and processing delays
    // 200 tweets is a good balance: 5x more than before, but fast enough to process
    const tweets = await fetchTweetsWithLimit(query, TWITTER_API_KEY, queryType, 200);

    console.log(`[TwitterServer] ✅ Found ${tweets.length} total tweets`);

    // Return tweets in the expected format
    res.json({
      tweets: tweets,
      count: tweets.length,
      has_next_page: false,
      next_cursor: null
    });

  } catch (error) {
    console.error('[TwitterServer] Error fetching tweets:', error.message);

    // Handle rate limiting
    if (error.response && error.response.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        tweets: [],
        count: 0
      });
    }

    res.status(500).json({
      error: 'Failed to fetch tweets',
      message: error.message,
      tweets: [],
      count: 0
    });
  }
});

/**
 * Fetch tweets with a maximum limit to avoid timeouts
 * @param {string} query - Twitter search query
 * @param {string} apiKey - Twitter API key
 * @param {string} queryType - "Latest" or "Top"
 * @param {number} maxTweets - Maximum number of tweets to fetch
 * @returns {Promise<Array>} List of tweets
 */
async function fetchTweetsWithLimit(query, apiKey, queryType, maxTweets) {
  const baseUrl = 'https://api.twitterapi.io/twitter/tweet/advanced_search';
  const headers = { 'x-api-key': apiKey };
  const allTweets = [];
  const seenTweetIds = new Set();
  let cursor = null;
  let lastMinId = null;
  const maxRetries = 3;

  console.log(`[Twitter] Fetching up to ${maxTweets} tweets...`);

  while (allTweets.length < maxTweets) {
    // Prepare query parameters
    const params = {
      query: cursor || lastMinId ? (lastMinId && !cursor ? `${query} max_id:${lastMinId}` : query) : query,
      queryType: queryType,
    };

    // Add cursor if available
    if (cursor) {
      params.cursor = cursor;
    }

    let retryCount = 0;
    let fetchedInThisIteration = false;

    while (retryCount < maxRetries) {
      try {
        // Make API request
        const response = await axios.get(baseUrl, {
          headers,
          params,
          timeout: 30000,
        });

        const data = response.data;

        // Extract tweets and metadata
        const tweets = data.tweets || [];
        const hasNextPage = data.has_next_page || false;
        cursor = data.next_cursor || null;

        // Filter out duplicate tweets
        const newTweets = tweets.filter((tweet) => !seenTweetIds.has(tweet.id));

        // Add new tweet IDs to the set and tweets to the collection (up to max)
        newTweets.forEach((tweet) => {
          if (allTweets.length < maxTweets) {
            seenTweetIds.add(tweet.id);
            allTweets.push(tweet);
          }
        });

        console.log(`[Twitter] Fetched ${newTweets.length} new tweets (${allTweets.length}/${maxTweets} total)`);

        fetchedInThisIteration = true;

        // If no new tweets and no next page, we're done
        if (newTweets.length === 0 && !hasNextPage) {
          console.log(`[Twitter] No more tweets available (${allTweets.length} total)`);
          return allTweets;
        }

        // If we've reached the max, return early
        if (allTweets.length >= maxTweets) {
          console.log(`[Twitter] Reached maximum of ${maxTweets} tweets`);
          return allTweets;
        }

        // Update lastMinId from the last tweet if available
        if (newTweets.length > 0) {
          lastMinId = newTweets[newTweets.length - 1].id;
        }

        // If no next page but we have new tweets, try with max_id
        if (!hasNextPage && newTweets.length > 0 && allTweets.length < maxTweets) {
          cursor = null; // Reset cursor for max_id pagination
          break;
        }

        // If has next page, continue with cursor
        if (hasNextPage) {
          break;
        }

        // If no more pages, we're done
        return allTweets;

      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          console.error(`[Twitter] Failed after ${maxRetries} attempts:`, error.message);
          return allTweets;
        }

        // Handle rate limiting
        if (error.response && error.response.status === 429) {
          console.log('[Twitter] Rate limit reached. Waiting 5 seconds...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.log(`[Twitter] Error: ${error.message}. Retrying ${retryCount}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }

    // If we didn't fetch anything and have no cursor, break
    if (!fetchedInThisIteration && !cursor && !lastMinId) {
      break;
    }

    // Safety check: if we're stuck in a loop without progress
    if (!fetchedInThisIteration) {
      console.log('[Twitter] No progress made, stopping pagination');
      break;
    }
  }

  return allTweets;
}

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
app.listen(PORT, () => {
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
