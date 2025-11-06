/**
 * Analysis Server - Server-side Tweet Analysis
 * Pipeline:
 *  - Fetch tweets from twitterapi.io (fetchTweetsWithLimit/fetchTweetsArchive)
 *  - Prefilter for cashtags, sentiment (DeepSeek LLM or keyword heuristic)
 *  - Fetch prices from Market API (FastAPI) and build trades
 *  - Cache results in-memory and optionally in Supabase via client-side services
 *
 * Default Port: 8002 (override with ANALYSIS_PORT)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Bottleneck = require('bottleneck');

// Load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const ANALYSIS_PORT = process.env.ANALYSIS_PORT || 8002;

// Session storage for progressive loading
// Structure: { sessionId: { status, totalTweets, stockTweets, bullishTweets, trades, stats, error } }
const analysisSessions = new Map();

// Cache for Twitter API results
// Structure: { handle_months: { tweets, timestamp } }
const twitterCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cache for complete analysis results
// Structure: { handle_months: { result, timestamp } }
const analysisCache = new Map();
const ANALYSIS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// API Keys
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || process.env.TW_BEARER;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!TWITTER_API_KEY) {
  console.error('[AnalysisServer] ❌ TWITTER_API_KEY not found');
  process.exit(1);
}

// Check if DeepSeek API key is available
let llmEnabled = false;
if (DEEPSEEK_API_KEY) {
  llmEnabled = true;
  console.log('[AnalysisServer] 🤖 LLM-based sentiment analysis enabled (DeepSeek)');
} else {
  console.log('[AnalysisServer] ⚠️  No DEEPSEEK_API_KEY found - using keyword-based sentiment analysis');
}

// Note: We use the market server (localhost:8000) for price data, not direct EODHD calls

// Enable CORS
app.use(cors());
app.use(express.json());

// Load companies data from Supabase Storage
const COMPANY_TICKERS_URL =
  process.env.EXPO_PUBLIC_COMPANY_TICKERS_URL ||
  "https://vjapeusemdciohsvnelx.supabase.co/storage/v1/object/sign/SEC_Company_Dataset/company_tickers.json?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MGFjOWExYi1lMDQ5LTQ3YWMtOTFiYy1mNTBkNmQwZmZhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJTRUNfQ29tcGFueV9EYXRhc2V0L2NvbXBhbnlfdGlja2Vycy5qc29uIiwiaWF0IjoxNzYyMzc2NDYwLCJleHAiOjE3OTM5MTI0NjB9.X1mioGFEwoV88cB52udqaxuNg8DuBvq7-g1CeEAxjYU";

let COMPANIES = [];

/**
 * Load companies from Supabase Storage
 */
async function loadCompanies() {
  try {
    console.log('[AnalysisServer] Fetching company tickers from Supabase...');
    const response = await axios.get(COMPANY_TICKERS_URL, { timeout: 30000 });
    const rawData = response.data;

    // Transform SEC data to our format
    for (const key in rawData) {
      const entry = rawData[key];
      if (entry.ticker && entry.title) {
        COMPANIES.push({
          ticker: entry.ticker.toUpperCase(),
          name: entry.title
        });
      }
    }

    console.log(`[AnalysisServer] Loaded ${COMPANIES.length} companies from SEC database`);
  } catch (error) {
    console.error('[AnalysisServer] Error loading companies:', error.message);
    console.error('[AnalysisServer] Failed to fetch company tickers. Server cannot start.');
    process.exit(1);
  }
}

/**
 * Main endpoint: Start analysis and return first batch of results
 * GET /api/analyze?handle=@buccocapital&months=12
 * Returns: { sessionId, handle, months, totalTweets, stockTweets, trades, stats, hasMore }
 */
app.get('/api/analyze', async (req, res) => {
  try {
    const { handle, months = 12 } = req.query;

    if (!handle) {
      return res.status(400).json({ error: 'Missing handle parameter' });
    }

    const cleanHandle = handle.replace('@', '');
    const cacheKey = `${cleanHandle}_${months}`;

    // Check analysis cache first
    const cachedAnalysis = analysisCache.get(cacheKey);
    if (cachedAnalysis && (Date.now() - cachedAnalysis.timestamp) < ANALYSIS_CACHE_TTL_MS) {
      console.log(`[AnalysisServer] 💾 Returning cached analysis for @${cleanHandle} (${months} months)`);
      return res.json({
        ...cachedAnalysis.result,
        cached: true
      });
    }

    const sessionId = uuidv4();

    console.log(`\n[AnalysisServer] ======================================`);
    console.log(`[AnalysisServer] Session ${sessionId}`);
    console.log(`[AnalysisServer] Analyzing @${cleanHandle} (${months} months)`);
    console.log(`[AnalysisServer] ======================================\n`);

    // Initialize session
    analysisSessions.set(sessionId, {
      handle: `@${cleanHandle}`,
      months: parseInt(months),
      status: 'processing',
      totalTweets: 0,
      stockTweets: 0,
      bullishTweets: [],
      trades: [],
      stats: {},
      error: null
    });

    // STEP 1: Fetch tweets from Twitter (with caching)
    console.log(`[AnalysisServer] Step 1: Fetching tweets...`);
    let tweets;
    const cachedTwitterData = twitterCache.get(cacheKey);

    if (cachedTwitterData && (Date.now() - cachedTwitterData.timestamp) < CACHE_TTL_MS) {
      console.log(`[AnalysisServer] 💾 Using cached tweets (${cachedTwitterData.tweets.length} tweets)`);
      tweets = cachedTwitterData.tweets;
    } else {
      console.log(`[AnalysisServer] 🐦 Fetching fresh tweets from Twitter API...`);
      // Dynamic max tweets: 1000 for 12 months, +500 per additional 12 months, capped at 3000
      const maxTweets = Math.min(3000, 1000 + Math.ceil(months / 12) * 500);
      console.log(`[AnalysisServer] Requesting up to ${maxTweets} tweets for ${months} months`);
      tweets = await fetchTweetsForHandle(cleanHandle, months, maxTweets);
      // Cache the Twitter API result
      twitterCache.set(cacheKey, {
        tweets: tweets,
        timestamp: Date.now()
      });
      console.log(`[AnalysisServer] 💾 Cached ${tweets.length} tweets for future requests`);
    }
    console.log(`[AnalysisServer] ✓ ${tweets.length} tweets available`);

    // STEP 2: Filter for stock mentions (prefilter)
    console.log(`[AnalysisServer] Step 2: Filtering for stock mentions...`);
    const stockTweets = filterForStockMentions(tweets, COMPANIES);
    console.log(`[AnalysisServer] ✓ Found ${stockTweets.length} stock-related tweets`);

    // Log which tickers were found
    const tickers = [...new Set(stockTweets.map(t => t.ticker))];
    console.log(`[AnalysisServer] Tickers found: ${tickers.join(', ')}`);

    // Update session
    const session = analysisSessions.get(sessionId);
    session.totalTweets = tweets.length;
    session.stockTweets = stockTweets.length;

    // STEP 3: Process FIRST BATCH of sentiment analysis (200 tweets = first 10 API calls)
    console.log(`[AnalysisServer] Step 3: Analyzing sentiment (first batch)...`);
    const FIRST_BATCH_SIZE = 200; // 10 API calls * 20 tweets each
    const firstBatchStockTweets = stockTweets.slice(0, FIRST_BATCH_SIZE);
    const remainingStockTweets = stockTweets.slice(FIRST_BATCH_SIZE);

    // Process first batch
    const firstBatchBullish = await filterForBullishSentiment(firstBatchStockTweets);
    console.log(`[AnalysisServer] ✓ First batch: Found ${firstBatchBullish.length} bullish tweets`);

    // STEP 4: Fetch prices for first batch
    console.log(`[AnalysisServer] Step 4: Fetching stock prices (first batch)...`);
    const firstBatchTrades = await fetchPricesAndBuildTrades(firstBatchBullish);
    console.log(`[AnalysisServer] ✓ Built ${firstBatchTrades.length} trades`);

    // Update session with first batch results
    session.bullishTweets = firstBatchBullish;
    session.trades = firstBatchTrades;
    session.stats = calculateStats(firstBatchTrades);

    // Return first batch results immediately
    const hasMore = remainingStockTweets.length > 0;
    res.json({
      sessionId: sessionId,
      handle: `@${cleanHandle}`,
      months: parseInt(months),
      totalTweets: tweets.length,
      stockTweets: stockTweets.length,
      trades: firstBatchTrades,
      stats: session.stats,
      hasMore: hasMore
    });

    // Continue processing remaining tweets in the background
    if (hasMore) {
      console.log(`[AnalysisServer] Processing remaining ${remainingStockTweets.length} stock tweets in background...`);
      processRemainingTweets(sessionId, remainingStockTweets).catch(error => {
        console.error(`[AnalysisServer] Background processing error:`, error.message);
        session.error = error.message;
        session.status = 'error';
      });
    } else {
      session.status = 'complete';
      console.log(`[AnalysisServer] ✓ Analysis complete (no more tweets)`);
    }

  } catch (error) {
    console.error('[AnalysisServer] Error:', error.message);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * Get results for an analysis session
 * GET /api/analyze/results/:sessionId
 */
app.get('/api/analyze/results/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = analysisSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId: sessionId,
    handle: session.handle,
    months: session.months,
    status: session.status,
    totalTweets: session.totalTweets,
    stockTweets: session.stockTweets,
    bullishTweets: session.bullishTweets.length,
    trades: session.trades,
    stats: session.stats,
    error: session.error
  });
});

/**
 * Process remaining tweets in the background
 */
async function processRemainingTweets(sessionId, remainingStockTweets) {
  const session = analysisSessions.get(sessionId);
  if (!session) return;

  try {
    // Process remaining tweets with sentiment analysis
    console.log(`[AnalysisServer] [${sessionId}] Analyzing remaining ${remainingStockTweets.length} tweets...`);
    const remainingBullish = await filterForBullishSentiment(remainingStockTweets);
    console.log(`[AnalysisServer] [${sessionId}] ✓ Found ${remainingBullish.length} additional bullish tweets`);

    // Fetch prices for remaining bullish tweets
    console.log(`[AnalysisServer] [${sessionId}] Fetching prices for additional trades...`);
    const remainingTrades = await fetchPricesAndBuildTrades(remainingBullish);
    console.log(`[AnalysisServer] [${sessionId}] ✓ Built ${remainingTrades.length} additional trades`);

    // Update session with combined results
    session.bullishTweets = [...session.bullishTweets, ...remainingBullish];
    session.trades = [...session.trades, ...remainingTrades];
    session.stats = calculateStats(session.trades);
    session.status = 'complete';

    console.log(`[AnalysisServer] [${sessionId}] ✓ Background processing complete!`);
    console.log(`[AnalysisServer] [${sessionId}] Total bullish tweets: ${session.bullishTweets.length}`);
    console.log(`[AnalysisServer] [${sessionId}] Total trades: ${session.trades.length}`);

    // Cache the complete analysis result
    const cacheKey = `${session.handle.replace('@', '')}_${session.months}`;
    const result = {
      sessionId: sessionId,
      handle: session.handle,
      months: session.months,
      totalTweets: session.totalTweets,
      stockTweets: session.stockTweets,
      trades: session.trades,
      stats: session.stats,
      hasMore: false
    };
    analysisCache.set(cacheKey, {
      result: result,
      timestamp: Date.now()
    });
    console.log(`[AnalysisServer] 💾 Cached complete analysis for ${session.handle}`);

  } catch (error) {
    console.error(`[AnalysisServer] [${sessionId}] Background processing error:`, error.message);
    session.error = error.message;
    session.status = 'error';
  }
}

/**
 * Fetch tweets for a handle from Twitter API using max_id for deep historical access
 */
async function fetchTweetsForHandle(handle, months, maxTweets) {
  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - months);
  const since = sinceDate.toISOString().split('T')[0];

  const query = `from:${handle} -is:retweet since:${since}`;
  console.log(`[AnalysisServer] Twitter query: "${query}"`);
  console.log(`[AnalysisServer] Fetching up to ${maxTweets} tweets from ${since} to today using max_id pagination`);

  // First attempt: broad query with pagination/max_id
  let tweets = await fetchTweetsWithLimit(query, TWITTER_API_KEY, 'Latest', maxTweets);

  // If we hit a recent-window ceiling (common ~30-40 days), walk back in date windows with since/until
  if (tweets.length < maxTweets) {
    console.log(`[AnalysisServer] Attempting rolling date-window backfill to extend history...`);
    const seen = new Set(tweets.map(t => t.id));

    // Iterate backwards in 14-day windows from today to sinceDate (larger windows = fewer API calls)
    const end = new Date();
    const start = new Date(sinceDate);
    let windowEnd = new Date(end);
    const MAX_WINDOWS = 30; // Limit to ~14 months of backfill (30 windows * 14 days)
    let windowCount = 0;

    while (tweets.length < maxTweets && windowEnd > start && windowCount < MAX_WINDOWS) {
      const windowStart = new Date(windowEnd);
      windowStart.setDate(windowStart.getDate() - 14); // 14-day windows instead of 7

      // Clamp windowStart to overall sinceDate
      if (windowStart < start) {
        windowStart.setTime(start.getTime());
      }

      const untilStr = windowEnd.toISOString().split('T')[0];
      const sinceStr = windowStart.toISOString().split('T')[0];
      const windowQuery = `from:${handle} -is:retweet since:${sinceStr} until:${untilStr}`;

      console.log(`[AnalysisServer] Window ${sinceStr} → ${untilStr}`);
      // Prefer twitterapi.io archive endpoint for deeper windows
      const windowTweets = await fetchTweetsArchive(windowQuery, Math.min(1000, maxTweets - tweets.length));

      let added = 0;
      for (const tw of windowTweets) {
        if (!seen.has(tw.id)) {
          seen.add(tw.id);
          tweets.push(tw);
          added++;
          if (tweets.length >= maxTweets) break;
        }
      }

      console.log(`[AnalysisServer] Added ${added} tweets from window (${tweets.length} total)`);

      // Move window back by 14 days
      windowEnd = new Date(windowStart);
      windowCount++;
      
      if (windowCount >= MAX_WINDOWS) {
        console.log(`[AnalysisServer] Reached maximum window limit (${MAX_WINDOWS}). Stopping backfill.`);
      }
    }
  }

  console.log(`[AnalysisServer] Total tweets fetched: ${tweets.length}`);

  if (tweets.length > 0) {
    const dates = tweets.map(t => t.createdAt || t.created_at).filter(Boolean);
    if (dates.length > 0) {
      const sortedDates = dates.sort();
      console.log(`[AnalysisServer] Oldest tweet: ${sortedDates[0]}`);
      console.log(`[AnalysisServer] Newest tweet: ${sortedDates[sortedDates.length - 1]}`);
    }
  }

  return tweets;
}

/**
 * Fetch tweets with pagination limit using cursor and max_id for deep historical access
 */
async function fetchTweetsWithLimit(query, apiKey, queryType, maxTweets) {
  // Environment validation
  const keyToUse = apiKey || process.env.TWITTER_API_KEY || process.env.TW_BEARER;
  if (!keyToUse) {
    throw new Error('Missing TWITTER_API_KEY — please set in .env');
  }

  const baseUrl = 'https://api.twitterapi.io/twitter/tweet/advanced_search';
  const headers = { 'x-api-key': keyToUse };

  // Bottleneck rate limiter: 1 request every 500ms, maxConcurrent 1
  if (!global.__twitterLimiter) {
    global.__twitterLimiter = new Bottleneck({ minTime: 500, maxConcurrent: 1 });
  }
  const limiter = global.__twitterLimiter;

  // Simple in-memory cache (60s)
  if (!global.__twitterCache) {
    global.__twitterCache = { map: new Map(), ttl: 60 * 1000 };
  }
  const cache = global.__twitterCache;

  const allTweets = [];
  const seenTweetIds = new Set();
  let cursor = null;
  let lastMinId = null;

  const maxRetries = 3;
  const axiosTimeout = 10000;

  // Helper to perform a single rate-limited request with retries
  const doRequest = async (paramsObj) => {
    const cacheKey = JSON.stringify(paramsObj);
    const now = Date.now();
    const cached = cache.map.get(cacheKey);
    if (cached && (now - cached.t) < cache.ttl) {
      return cached.v;
    }

    let attempt = 0;
    let lastErr = null;
    while (attempt < maxRetries) {
      attempt++;
      const start = Date.now();
      try {
        const resp = await limiter.schedule(() => axios.get(baseUrl, {
          headers,
          params: paramsObj,
          timeout: axiosTimeout,
          validateStatus: () => true
        }));

        const ms = Date.now() - start;
        const status = resp.status;

        if (status >= 200 && status < 300) {
          console.log(`[Twitter] OK ${status} (${ms}ms) query="${paramsObj.query}"`);
          cache.map.set(cacheKey, { v: resp, t: now });
          return resp;
        }

        // 4xx: do not retry
        if (status >= 400 && status < 500) {
          console.warn(`[Twitter] ${status} — not retrying. Query="${paramsObj.query}" Message="${(resp.data && resp.data.error) || 'Client error'}"`);
          lastErr = new Error(`Twitter API error ${status}`);
          break;
        }

        // 5xx: retry
        console.warn(`[Twitter] ${status} attempt ${attempt}/${maxRetries} — ${ms}ms`);
        lastErr = new Error(`Server error ${status}`);
      } catch (e) {
        lastErr = e;
        console.warn(`[Twitter] Network error attempt ${attempt}/${maxRetries}: ${e.message}`);
      }

      // backoff: 1s * attempt
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    // All retries failed
    throw new Error(`Failed to fetch tweets after ${maxRetries} attempts: ${(lastErr && lastErr.message) || 'unknown error'}`);
  };

  while (allTweets.length < maxTweets) {
    const params = { queryType: queryType };
    if (cursor) {
      params.cursor = cursor;
      params.query = query;
    } else if (lastMinId) {
      params.query = `${query} max_id:${lastMinId}`;
    } else {
      params.query = query;
    }

    let hasNextPage = false;
    let tweets = [];
    let newTweets = [];

    const resp = await doRequest(params);
    const data = resp && resp.data ? resp.data : resp;

    tweets = (data && data.tweets) || [];
    hasNextPage = (data && (data.has_next_page === true)) || false;
    cursor = (data && data.next_cursor) || null;

    console.log(`[Twitter] Page fetched: ${tweets.length} tweets, hasNextPage: ${hasNextPage}, cursor: ${cursor ? 'present' : 'null'}, lastMinId: ${lastMinId || 'null'}, total so far: ${allTweets.length}`);

    newTweets = Array.isArray(tweets) ? tweets.filter((tw) => tw && !seenTweetIds.has(tw.id)) : [];
    for (const tw of newTweets) {
      if (allTweets.length >= maxTweets) break;
      seenTweetIds.add(tw.id);
      allTweets.push(tw);
    }

    if (newTweets.length > 0) {
      lastMinId = newTweets[newTweets.length - 1].id;
    }

    // Stop if no tweets and no next page
    if ((tweets.length === 0 && !hasNextPage)) {
      console.log('[Twitter] Stopping: no more results');
      break;
    }

    // Try max_id path if needed
    if (!hasNextPage && newTweets.length > 0) {
      console.log(`[Twitter] 🔄 Switching to max_id pagination. Last tweet ID: ${lastMinId}`);
      cursor = null;
      continue;
    }

    if (!hasNextPage && !cursor && lastMinId) {
      console.log(`[Twitter] 🛑 No more tweets available with max_id pagination`);
      break;
    }
  }

  return allTweets;
}

/**
 * Fetch tweets via twitterapi.io archive endpoint for a single window
 * Uses POST /search/tweets which supports full-archive per provider docs
 */
async function fetchTweetsArchive(query, limit) {
  const url = 'https://api.twitterapi.io/search/tweets';
  try {
    const response = await axios.post(url, {
      query: query,
      limit: Math.min(Math.max(1, limit || 100), 1000),
      include_metrics: false,
      include_user_data: false
    }, {
      headers: {
        'X-API-Key': TWITTER_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const data = response.data || {};
    const tweets = data.tweets || data.data || [];
    console.log(`[TwitterArchive] ${tweets.length} tweets for archive window query`);
    return tweets;
  } catch (error) {
    console.warn('[TwitterArchive] Error fetching archive window:', error.message);
    return [];
  }
}

/**
 * Filter tweets for stock mentions (prefilter logic)
 * ONLY accepts tweets with cashtags (e.g., $AMZN, $TSLA)
 */
function filterForStockMentions(tweets, companies) {
  return tweets.filter(tweet => {
    // Extract text from multiple possible fields
    const text = tweet.text || tweet.full_text || tweet.content || tweet.body || '';

    // ONLY accept tweets with $TICKER pattern (cashtag)
    const dollarTickerPattern = /\$([A-Z]{1,5})\b/g;
    const dollarMatches = text.match(dollarTickerPattern);

    return dollarMatches && dollarMatches.length > 0;
  }).map(tweet => {
    // Find the matching company for each tweet
    const text = tweet.text || tweet.full_text || tweet.content || tweet.body || '';
    const matchedCompany = findMatchingCompany(text, companies);
    return {
      ...tweet,
      text: text, // Ensure text field is set
      ticker: matchedCompany ? matchedCompany.ticker : null,
      companyName: matchedCompany ? matchedCompany.name : null
    };
  }).filter(tweet => tweet.ticker !== null); // Only keep tweets with identified tickers
}

/**
 * Find the best matching company for a tweet
 * ONLY matches cashtags (e.g., $AMZN, $TSLA)
 */
function findMatchingCompany(text, companies) {
  // ONLY match $TICKER pattern (cashtag)
  const dollarTickerPattern = /\$([A-Z]{1,5})\b/g;
  const dollarMatches = [...(text || '').toString().matchAll(dollarTickerPattern)];

  if (dollarMatches.length > 0) {
    const ticker = dollarMatches[0][1];
    const company = companies.find(c => c.ticker === ticker);
    if (company) return company;
  }

  return null;
}

/**
 * Filter for bullish sentiment (sentiment analysis logic)
 * Uses LLM if available, otherwise falls back to keyword-based analysis
 */
async function filterForBullishSentiment(stockTweets) {
  if (llmEnabled) {
    return await filterForBullishSentimentLLM(stockTweets);
  } else {
    return stockTweets.filter(tweet => {
      // Extract text from multiple possible fields
      const text = tweet.text || tweet.full_text || tweet.content || tweet.body || '';
      return isBullishOnKeywords(text, tweet.ticker, tweet.companyName);
    });
  }
}

/**
 * LLM-based sentiment analysis using contextual reasoning with rate limiting
 * Analyzes tweets in batches for efficiency using DeepSeek API
 */
async function filterForBullishSentimentLLM(stockTweets) {
  const BATCH_SIZE = 20; // Process 20 tweets at a time
  const RATE_LIMIT = 50; // DeepSeek: Adjust based on your plan
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute in milliseconds
  const bullishTweets = [];

  const totalBatches = Math.ceil(stockTweets.length / BATCH_SIZE);
  console.log(`[AnalysisServer] Processing ${stockTweets.length} tweets in ${totalBatches} batches`);

  // Process tweets in batches with rate limiting
  for (let i = 0; i < stockTweets.length; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE);
    const batch = stockTweets.slice(i, i + BATCH_SIZE);

    // If we've processed RATE_LIMIT batches, wait for the rate limit window to reset
    if (batchIndex > 0 && batchIndex % RATE_LIMIT === 0) {
      const waitTimeSeconds = RATE_LIMIT_WINDOW_MS / 1000;
      console.log(`[AnalysisServer] ⏳ Rate limit reached (${RATE_LIMIT} requests). Waiting ${waitTimeSeconds}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW_MS));
      console.log(`[AnalysisServer] ✓ Resuming processing (batch ${batchIndex + 1}/${totalBatches})`);
    }

    // Create the prompt with all tweets in the batch
    const tweetsForAnalysis = batch.map((tweet, idx) => {
      // Extract text from multiple possible fields
      const text = tweet.text || tweet.full_text || tweet.content || tweet.body || '';
      return `${idx + 1}. [${tweet.ticker}] "${text}"`;
    }).join('\n\n');

    const systemPrompt = `You are an expert in financial sentiment analysis. Analyze each tweet below and determine if:
1) The ticker mentioned is ACTUALLY referring to a stock (not a common word)
2) The AUTHOR expresses BULLISH sentiment toward that stock

${tweetsForAnalysis}

For each tweet, follow this reasoning process:

**Step 0: Validate Ticker Mention**
CRITICAL: Determine if the ticker is actually referring to a stock or just a common word.

⚠️ WARNING: These tickers are ALSO common English words - use contextual reasoning:
  - IT, ON, NOW, YOU, UP, SO, AS, ARE, WELL, OPEN, A, GO, BE, AT, OUT, IN, FOR, OR, NEW, ALL, BY, TO, OF, THE, AND, BUT, AN, IF, NEXT
  - NET, STAY, HOPE, SAVE, PLUS, AWAY, TELL, EVER, LOVE, NICE, GOOD, BEST, GROW, BOOM, SNAP, CARE, TRUE, REAL, PLAY, POST, SAFE, RAIL, LOAN, FOLD
  - TEAM, TRIP, WORK, HOME, LIFE, AUTO, TECH, DATA

Use STRICT CONTEXTUAL REASONING - Apply the substitution test:

🧠 SUBSTITUTION TEST: Replace the word with "[STOCK_NAME]" - if the sentence becomes nonsensical, it's NOT a stock ticker.

✅ ACCEPT as STOCK only if substitution makes sense:
  - "I'm bullish NOW stock" → "I'm bullish [STOCK_NAME] stock" ✅ Makes sense
  - "Buying more UP today" → "Buying more [STOCK_NAME] today" ✅ Makes sense
  - "$NOW breaking out" → "$[STOCK_NAME] breaking out" ✅ Makes sense
  - "OPEN looks cheap here" → "[STOCK_NAME] looks cheap here" ✅ Makes sense

❌ REJECT as COMMON WORD if substitution is nonsensical:
  - "Build a safety net" → "Build a safety [STOCK_NAME]" ❌ Nonsense (not stock)
  - "Great team effort" → "Great [STOCK_NAME] effort" ❌ Nonsense (not stock)
  - "I will eat now" → "I will eat [STOCK_NAME]" ❌ Nonsense (not stock)
  - "Going up 20%" → "Going [STOCK_NAME] 20%" ❌ Nonsense (not stock)
  - "Markets are open" → "Markets are [STOCK_NAME]" ❌ Nonsense (not stock)
  - "Trading on Robinhood" → "Trading [STOCK_NAME] Robinhood" ❌ Nonsense (not stock)
  - "It looks good" → "[STOCK_NAME] looks good" ❌ Could be stock, but "it" is pronoun
  - "Save your money" → "[STOCK_NAME] your money" ❌ Nonsense (not stock)
  - "Hope you win" → "[STOCK_NAME] you win" ❌ Nonsense (not stock)

🚨 CRITICAL EXAMPLES - These MUST be rejected:
  - "safety net" = NOT NET stock
  - "team player" = NOT TEAM stock
  - "going up" = NOT UP stock
  - "right now" = NOT NOW stock
  - "wide open" = NOT OPEN stock
  - "save money" = NOT SAVE stock
  - "work hard" = NOT WORK stock
  - "best option" = NOT BEST stock

If the word is part of a common phrase or idiom, it is NOT a stock ticker.

**Step 1: Identify the Actor**
- Who is performing the action (buying, commenting, etc.)?
- If it's someone other than the author (e.g., "my friend bought," "he told me"), the author may not be expressing personal sentiment.

**Step 2: Identify Tone**
- Is the author being sarcastic, ironic, or humorous about the stock's performance?
- Sarcasm signals: "funny", "ridiculous", "lol", "lmao", "imagine", "my absolute boy", "observe", "ah yes", "proudly", "leaving only silence", "elusive", "great migration", "faint sound"
- Mocking patterns: Describing a stock rise followed by fall in theatrical/nature documentary style
- If joking, mocking, or being theatrical about losses, it's NOT bullish.
- Example: "Observe the elusive $X in its natural habitat... then plunge 25%" = SARCASTIC, NOT bullish

**Step 3: Assess Intent and Conviction**
- Does the author personally endorse the stock with conviction?
- Or are they just reporting/mocking another person's behavior?
- Only classify as BULLISH if the author shows personal positive belief.

**Step 4: Verify Strong Bullish Signal**
CRITICAL: The tweet must contain EXPLICIT bullish signals with CONVICTION. This is extremely important.

✅ REQUIRED - Tweet must have at least ONE of these:
- Direct ownership action: "I bought", "I'm buying", "Added to my position", "Going long", "Opened a position"
- Strong conviction language: "Must own", "Love this stock", "Top pick", "Bullish on", "This is a buy"
- Specific price targets with rationale: "Going to $X because...", "Targeting $X"
- Detailed investment thesis with clear upside explanation

❌ REJECT these patterns (NOT bullish enough):
- Observational only: "Stock hit new high", "Breaking out", "Up 20% today", "Interesting chart"
- Neutral commentary: "Watching this", "Interesting move", "Keep an eye on", "Looking at this"
- Questions: "Anyone buying?", "What do you think?", "Thoughts on this?"
- Analysis without position: "Good fundamentals", "Strong growth", "Nice setup" (without saying they own/are buying)
- Tentative language: "Might buy", "Thinking about", "Considering", "Could be good"
- Sharing others' analysis without personal endorsement: "Check out this DD", "Interesting take on..."

🚨 CRITICAL: If there's ANY doubt about whether the author is expressing strong personal bullish conviction with action or intent to act, mark it as NOT BULLISH. Be extremely strict.

**Decision Rules:**
- ✅ BULLISH: Ticker is actually a stock reference AND author expresses STRONG personal positive belief or action toward stock
- ❌ NOT BULLISH: Ticker is a common word OR author mocks/jokes/reports others' actions OR is sarcastic OR lacks strong bullish conviction OR describes stock falling/plunging

🚨 CRITICAL BEARISH SIGNALS - Always REJECT these:
- Mentions of falling, plunging, dropping, crashing: "plunge 25%", "great migration downward"
- Post-earnings disappointment: "falls after earnings", "earnings miss"
- Sarcastic/theatrical descriptions of losses: "leaving only silence", "faint sound of analysts adjusting"
- Mocking investors who bought: "attracting eager investors... then plunge"

Example that MUST be rejected:
"Observe the elusive $SNAP... ascends before earnings... then plunge 25%, leaving only silence" = SARCASTIC about losses, NOT bullish

🚨 CRITICAL INSTRUCTION 🚨
You MUST respond with ONLY a JSON array. No explanations. No reasoning. No text. ONLY the JSON array.

Examples of CORRECT responses:
- [1, 4, 6]
- [2]
- []

Examples of INCORRECT responses (DO NOT DO THIS):
- "Let me analyze... [1, 4]" ❌
- "Based on my analysis: [1, 4]" ❌
- "Tweet 1 is bullish because..." ❌

Respond with ONLY the JSON array:`;

    try {
      // Call DeepSeek API with OpenAI-compatible endpoint
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.0, // Deterministic responses for consistent analysis
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const responseText = response.data.choices[0].message.content.trim();

      // Strip markdown code blocks if present (LLMs often wrap JSON in ```json ... ```)
      let cleanedResponse = responseText;
      if (responseText.includes('```')) {
        cleanedResponse = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      }

      // Parse the JSON response
      let bullishIndices = [];
      try {
        bullishIndices = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.warn(`[AnalysisServer] Failed to parse LLM response: ${responseText}`);
        continue;
      }

      // Add the bullish tweets from this batch
      bullishIndices.forEach(idx => {
        if (idx >= 1 && idx <= batch.length) {
          bullishTweets.push(batch[idx - 1]); // Convert from 1-indexed to 0-indexed
        }
      });

      console.log(`[AnalysisServer] ✓ Batch ${batchIndex + 1}/${totalBatches}: Found ${bullishIndices.length} bullish tweets`);

    } catch (error) {
      console.error(`[AnalysisServer] LLM sentiment analysis error (batch ${batchIndex + 1}):`, error.message);

      // Fallback to keyword-based for this batch
      const fallbackBullish = batch.filter(tweet => isBullishOnKeywords(tweet.text, tweet.ticker, tweet.companyName));
      bullishTweets.push(...fallbackBullish);
      console.log(`[AnalysisServer] ⚠️  Batch ${batchIndex + 1}: Fell back to keyword-based (${fallbackBullish.length} bullish)`);
    }
  }

  return bullishTweets;
}

/**
 * Keyword-based sentiment analysis (fallback when LLM is not available)
 */
function isBullishOnKeywords(text, ticker, companyName) {
  if (!text) return false;

  const lowerText = text.toLowerCase();

  // STEP 1: Check for third-party/anecdotal stories (someone else's action, not the author's conviction)
  const thirdPartyPatterns = [
    /(?:he|she|they|my (?:friend|buddy|boy|girl|pal|colleague)|someone)\s+(?:just\s+)?(?:told me|said|bought|sold|owns|thinks)/i,
    /(?:told me|heard|was told)\s+(?:he|she|they)/i,
    /out to (?:dinner|lunch|breakfast)\s+with.*(?:bought|sold|told|said)/i,
    /talked to.*(?:bought|sold|told|said)/i,
    /(?:because|since)\s+(?:he|she|they)\s+thought.*(?:funny|ridiculous|silly|joke)/i,
    /thought.*was\s+(?:funny|ridiculous|silly|a joke)/i
  ];

  if (thirdPartyPatterns.some(pattern => pattern.test(text))) {
    return false;
  }

  // STEP 2: Check for sarcasm/skepticism (disqualifiers)
  const sarcasticIndicators = [
    'lol', 'lmao', 'rofl', '😂', '🤡', 'clown', 'cope', 'copium',
    'making fun', 'ridiculous', 'insane that', 'crazy that', 'hilarious', 'joke',
    'good luck to you all', 'my favorite genre', 'odd strategy', 'what an', 'in the dark',
    'absolute boy', 'funny'
  ];

  if (sarcasticIndicators.some(indicator => lowerText.includes(indicator))) {
    return false;
  }

  // STEP 3: Check for skeptical patterns
  const skepticalPatterns = [
    /up \d+% .*(on|after).*(guide|guidance).*(2030|2035|2040)/i,
    /guide.*(far away|distant|years? away)/i,
    /pumping on.*nothing/i,
    /bubble/i,
    /overvalued/i,
    /overhyped/i,
    /nonsense/i,
    /as they (go|drop|fall) down/i,
    /tweeting about buying.*as they/i
  ];

  if (skepticalPatterns.some(pattern => pattern.test(text))) {
    return false;
  }

  // STEP 3: Check for strong bullish patterns
  const strongBullishPatterns = [
    /(?:have to|need to|must|should) own/i,
    /irresponsible not to/i,
    /literally what are you doing/i,
    /if you (?:don't|do not) own.*what are you doing/i,
    /(?:buying|bought|added to|accumulating)/i,
    /going long/i,
    /loading up/i,
    /doubling down/i,
    /national emergency/i,
    /bullish (?:on|about)/i,
    /love this/i,
    /top pick/i,
    /favorite/i,
    /best (?:in class|idea)/i,
    /(?:works|will work) from here/i,
    /(?:huge|big|massive) (?:opportunity|upside|potential)/i,
    /(?:undervalued|underpriced|cheap here)/i,
    /(?:going higher|heading to|target)/i,
    /(?:strong|great|huge) growth/i,
    /game[- ]changer/i,
    /catalysts/i,
    /momentum/i
  ];

  if (strongBullishPatterns.some(pattern => pattern.test(text))) {
    return true;
  }

  // STEP 4: Check for neutral/observational (not actionable)
  const neutralPatterns = [
    /(?:trading|sitting) at/i,
    /closed at/i,
    /reached/i,
    /broke through/i,
    /currently/i
  ];

  if (neutralPatterns.some(pattern => pattern.test(text))) {
    return false;
  }

  // STEP 5: Check for uncertainty
  const uncertaintyPatterns = [
    /(?:might|maybe|possibly|could be)/i,
    /watching/i,
    /monitoring/i,
    /waiting for/i,
    /depends on/i
  ];

  if (uncertaintyPatterns.some(pattern => pattern.test(text))) {
    return false;
  }

  // Default: not bullish
  return false;
}

/**
 * Parse Twitter date format to ISO string
 * Twitter format: "Fri Sep 12 13:48:25 +0000 2025"
 * Output: "2025-09-12"
 */
function parseTwitterDate(twitterDateStr) {
  if (!twitterDateStr) {
    return new Date().toISOString().split('T')[0];
  }

  try {
    // Parse Twitter date format: "Fri Sep 12 13:48:25 +0000 2025"
    const date = new Date(twitterDateStr);

    if (isNaN(date.getTime())) {
      console.warn(`[AnalysisServer] Invalid date format: ${twitterDateStr}`);
      return new Date().toISOString().split('T')[0];
    }

    // Return ISO date string (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn(`[AnalysisServer] Error parsing date: ${twitterDateStr}`, error.message);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Deduplicate tweets by ticker, keeping only the earliest tweet for each ticker
 */
function deduplicateByTicker(tweets) {
  const tickerMap = new Map();

  for (const tweet of tweets) {
    const ticker = tweet.ticker;
    if (!ticker) continue;

    // Get tweet date
    const tweetDateStr = tweet.createdAt || tweet.created_at || tweet.created_on || tweet.tweetDate;
    const tweetDate = new Date(tweetDateStr);

    // If we haven't seen this ticker before, or if this tweet is earlier, keep it
    if (!tickerMap.has(ticker)) {
      tickerMap.set(ticker, tweet);
    } else {
      const existingTweet = tickerMap.get(ticker);
      const existingDateStr = existingTweet.createdAt || existingTweet.created_at || existingTweet.created_on || existingTweet.tweetDate;
      const existingDate = new Date(existingDateStr);

      // Keep the earlier tweet
      if (tweetDate < existingDate) {
        tickerMap.set(ticker, tweet);
      }
    }
  }

  return Array.from(tickerMap.values());
}

/**
 * Fetch prices and build trade objects
 */
async function fetchPricesAndBuildTrades(bullishTweets) {
  // Deduplicate tweets by ticker, keeping only the earliest tweet for each ticker
  const deduplicatedTweets = deduplicateByTicker(bullishTweets);

  if (deduplicatedTweets.length < bullishTweets.length) {
    console.log(`[AnalysisServer] Deduplicated ${bullishTweets.length} tweets to ${deduplicatedTweets.length} unique tickers`);
  }

  const trades = [];
  const marketServerUrl = 'http://localhost:8000';

  for (const tweet of deduplicatedTweets) {
    try {
      const ticker = tweet.ticker;
      // Twitter API returns createdAt (camelCase)
      const twitterDateStr = tweet.createdAt || tweet.created_at || tweet.created_on || tweet.tweetDate;

      // Parse Twitter date to ISO format (YYYY-MM-DD)
      const tweetDate = parseTwitterDate(twitterDateStr);

      // Debug logging for first 3 tweets
      if (trades.length < 3) {
        console.log(`[AnalysisServer] DEBUG Tweet #${trades.length + 1}:`);
        console.log(`  - Raw date: ${twitterDateStr}`);
        console.log(`  - Parsed date: ${tweetDate}`);
        console.log(`  - Ticker: ${ticker}`);
      }

      // Fetch entry price (at time of tweet) and latest price
      const priceData = await fetchPricesForTicker(ticker, tweetDate, marketServerUrl);

      if (!priceData.entryPrice || !priceData.latestPrice) {
        console.warn(`[AnalysisServer] Missing price data for ${ticker}`);
        continue;
      }

      const stockReturn = ((priceData.latestPrice - priceData.entryPrice) / priceData.entryPrice) * 100;

      // Extract tweet text from multiple possible fields
      const tweetText = tweet.text || tweet.full_text || tweet.content || tweet.body || '';
      const tweetTextTruncated = tweetText.substring(0, 200);
      
      if (!tweetText && trades.length < 3) {
        console.warn(`[AnalysisServer] Tweet ${tweet.id} has no text field. Available fields:`, Object.keys(tweet));
      }

      trades.push({
        id: tweet.id,
        ticker: ticker,
        company: tweet.companyName,
        tweetText: tweetTextTruncated,
        dateMentioned: tweetDate,
        tweetDate: tweetDate,
        tweetUrl: `https://twitter.com/i/web/status/${tweet.id}`,
        beginningValue: parseFloat(priceData.entryPrice.toFixed(2)),
        lastValue: parseFloat(priceData.latestPrice.toFixed(2)),
        entryPrice: parseFloat(priceData.entryPrice.toFixed(2)),
        currentPrice: parseFloat(priceData.latestPrice.toFixed(2)),
        stockReturn: parseFloat(stockReturn.toFixed(2)),
        alphaVsSPY: parseFloat(stockReturn.toFixed(2)),
        alpha: 0,
        dividends: 0,
        chartData: []
      });

    } catch (error) {
      console.error(`[AnalysisServer] Error processing tweet ${tweet.id}:`, error.message);
    }
  }

  return trades;
}

/**
 * Fetch prices for a ticker from market server
 */
async function fetchPricesForTicker(ticker, tweetDate, marketServerUrl) {
  try {
    const response = await axios.post(`${marketServerUrl}/api/quotes/batch`, {
      requests: [
        { symbol: ticker, type: 'entry', tweetTimestamp: tweetDate },
        { symbol: ticker, type: 'latest' }
      ]
    }, {
      timeout: 10000
    });

    // Response format is { data: [{symbol, type, price, priceDate, error}] }
    const prices = response.data.data || [];
    const entryPriceObj = prices.find(p => p.symbol === ticker && p.type === 'entry');
    const latestPriceObj = prices.find(p => p.symbol === ticker && p.type === 'latest');

    const entryPrice = entryPriceObj && !entryPriceObj.error ? entryPriceObj.price : null;
    const latestPrice = latestPriceObj && !latestPriceObj.error ? latestPriceObj.price : null;

    // Fallback: use latest price as entry if entry is missing (same-day tweets)
    return {
      entryPrice: entryPrice || latestPrice,
      latestPrice: latestPrice
    };

  } catch (error) {
    throw new Error(`Failed to fetch prices for ${ticker}: ${error.message}`);
  }
}

/**
 * Calculate statistics from trades
 */
function calculateStats(trades) {
  if (trades.length === 0) {
    return {
      avgReturn: 0,
      alpha: 0,
      winRate: 0,
      hitRatio: 0,
      totalTrades: 0
    };
  }

  const returns = trades.map(t => t.stockReturn);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  const winners = trades.filter(t => t.stockReturn > 0);
  const winRate = (winners.length / trades.length) * 100;

  const spyBenchmark = 10; // Simplified SPY benchmark
  const beatsMarket = trades.filter(t => t.stockReturn > spyBenchmark);
  const hitRatio = (beatsMarket.length / trades.length) * 100;

  return {
    avgReturn: parseFloat(avgReturn.toFixed(2)),
    alpha: parseFloat((avgReturn - spyBenchmark).toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    hitRatio: parseFloat(hitRatio.toFixed(1)),
    totalTrades: trades.length
  };
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'analysis-server',
    port: ANALYSIS_PORT,
    twitterApiKey: TWITTER_API_KEY ? 'configured' : 'missing',
    companies: COMPANIES.length
  });
});

// Start server locally only (avoid starting in serverless env like Vercel)
if (!process.env.VERCEL) {
  (async () => {
    await loadCompanies();
    app.listen(ANALYSIS_PORT, () => {
      console.log(`\n✅ Analysis Server running on http://localhost:${ANALYSIS_PORT}`);
      console.log(`📋 Endpoint: GET /api/analyze?handle=@username&months=12`);
      console.log(`🔑 Twitter API: ${TWITTER_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
      console.log(`📊 Companies loaded: ${COMPANIES.length}\n`);
    });
  })();
}

// Export selected functions for reuse (e.g., twitterServer.js)
module.exports = {
  app,
  loadCompanies,
  fetchTweetsWithLimit,
  fetchTweetsArchive
};
