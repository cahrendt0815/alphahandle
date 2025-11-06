/**
 * Extract real tweets from Twitter using TwitterAPI.io
 * This replaces the simulated data with actual Twitter data
 */

require('dotenv').config({ debug: true });
const fs = require('fs');
const path = require('path');
const { fetchTweetsFromHandle } = require('./twitterScraper');
const { shouldFetchTweets, updateCache, getLastTweetDate } = require('./tweetCache');
const { smartFilterTweets } = require('./smartFetch');

// Configuration
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || process.env.TW_BEARER || '';
const HANDLE = process.env.HANDLE || 'abc';
const OUTPUT_DIR = path.join(__dirname, '../out');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'raw_tweets.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Main extraction function
 */
async function main() {
  console.log('[Extract] ===============================================');
  console.log('[Extract] Extracting REAL tweets from Twitter');
  console.log('[Extract] ===============================================\n');

  console.log(`[Extract] Target handle: @${HANDLE}`);
  console.log(`[Extract] API Key: ${TWITTER_API_KEY.substring(0, 10)}...`);

  // ⚠️ TIMESTAMP-BASED CACHE CHECK: Prevent expensive API calls within 24 hours
  const cacheCheck = shouldFetchTweets(HANDLE);

  if (!cacheCheck.shouldFetch) {
    console.log(`\n[Extract] ⚠️  CACHE HIT: Tweets already fetched recently for @${HANDLE}!`);
    console.log(`[Extract] ${cacheCheck.reason}`);
    console.log(`[Extract] Last fetched: ${cacheCheck.lastFetch}`);
    console.log(`[Extract] Cached tweets: ${cacheCheck.tweetCount}`);
    console.log(`[Extract] TwitterAPI.io calls are EXPENSIVE!`);
    console.log(`\n[Extract] Using cached data from ${OUTPUT_FILE}`);
    console.log(`\n[Extract] To force re-fetch tweets:`);
    console.log(`  1. Wait 24 hours from last fetch`);
    console.log(`  2. Set FORCE_REFETCH=true in .env`);
    console.log(`  3. Run: node simulation/tweetCache.js clear ${HANDLE}\n`);

    if (process.env.FORCE_REFETCH !== 'true') {
      console.log('[Extract] ✅ Using cached data (no API call made)\n');
      process.exit(0);
    }

    console.log('[Extract] FORCE_REFETCH=true detected, proceeding with API call...\n');
  } else {
    console.log(`\n[Extract] ${cacheCheck.reason}`);
    if (cacheCheck.lastFetch) {
      console.log(`[Extract] Last fetch was: ${cacheCheck.lastFetch}`);
    }
  }

  try {
    // Calculate date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startDate = sixMonthsAgo.toISOString().split('T')[0];

    console.log(`[Extract] Fetching tweets from ${startDate} to today`);

    // Fetch tweets from the handle (no limit for now, we'll filter based on user tier)
    const allTweets = await fetchTweetsFromHandle(HANDLE, TWITTER_API_KEY, {
      startDate: startDate,
    });

    if (allTweets.length === 0) {
      console.warn('[Extract] ⚠️  No tweets found for this handle');
      return;
    }

    console.log(`[Extract] Fetched ${allTweets.length} total tweets from API`);

    // For now, treat all as paid users (get all tweets)
    // In production, check user's subscription status here
    const isPaidUser = process.env.FORCE_FREE_TIER !== 'true'; // Can be overridden for testing

    // Apply smart filtering for free tier users
    const filterResult = smartFilterTweets(allTweets, isPaidUser);
    const tweets = filterResult.tweets;

    if (!isPaidUser && filterResult.stoppedEarly) {
      console.log(`[Extract] Free tier: Stopped at ${tweets.length} tweets (last ticker at position ${filterResult.lastTickerAt})`);
      if (filterResult.noTickersFound) {
        console.log(`[Extract] ⚠️  No tickers found in first 50 tweets - user will see blurred results`);
      }
    }

    // Get the most recent tweet date (first tweet is newest)
    const mostRecentTweetDate = tweets[0]?.createdAt ? new Date(tweets[0].createdAt).toISOString() : null;

    // Save filtered tweets
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tweets, null, 2));
    console.log(`\n[Extract] ✅ Saved ${tweets.length} tweets to ${OUTPUT_FILE}`);

    // Update cache metadata
    updateCache(HANDLE, tweets.length, mostRecentTweetDate);

    // Display sample tweet structure
    console.log('\n[Extract] Sample tweet structure:');
    console.log(JSON.stringify(tweets[0], null, 2).substring(0, 500) + '...');

  } catch (error) {
    console.error('[Extract] ❌ Error:', error.message);
    process.exit(1);
  }
}

// Run extraction
main().catch(err => {
  console.error('[Extract] ❌ Fatal error:', err);
  process.exit(1);
});