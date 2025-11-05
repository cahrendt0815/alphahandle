/**
 * Normalize real Twitter data - Extract tickers and sentiment from tweets
 */

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = path.join(__dirname, '../out/raw_tweets.json');
const OUTPUT_FILE = path.join(__dirname, '../out/normalized_recommendations.jsonl');

// Ticker regex pattern - matches $TICKER format
const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;

// Sentiment keywords
const BULLISH_KEYWORDS = [
  'bullish', 'buy', 'long', 'undervalued', 'opportunity', 'cheap',
  'upside', 'growth', 'strong', 'beat', 'outperform', 'positive',
  'conviction', 'quality', 'thesis', 'accumulate', 'attractive'
];

const BEARISH_KEYWORDS = [
  'bearish', 'sell', 'short', 'overvalued', 'expensive', 'avoid',
  'downside', 'weak', 'miss', 'underperform', 'negative', 'risk',
  'concern', 'overpriced', 'bubble', 'dump', 'exit'
];

/**
 * Extract tickers from tweet text
 */
function extractTickers(text) {
  const tickers = new Set();
  const matches = text.matchAll(TICKER_REGEX);

  for (const match of matches) {
    tickers.add(match[1]);
  }

  return Array.from(tickers);
}

/**
 * Determine sentiment from tweet text
 * Returns 'bullish', 'bearish', or 'neutral'
 */
function determineSentiment(text) {
  const lowerText = text.toLowerCase();

  let bullishScore = 0;
  let bearishScore = 0;

  // Count bullish keywords
  for (const keyword of BULLISH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      bullishScore++;
    }
  }

  // Count bearish keywords
  for (const keyword of BEARISH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      bearishScore++;
    }
  }

  // Determine sentiment based on scores
  if (bullishScore > bearishScore) {
    return 'bullish';
  } else if (bearishScore > bullishScore) {
    return 'bearish';
  } else {
    // Default to bullish if ticker is mentioned without clear sentiment
    return 'bullish';
  }
}

/**
 * Normalize a single tweet
 */
function normalizeTweet(tweet) {
  const tickers = extractTickers(tweet.text);

  if (tickers.length === 0) {
    return []; // No tickers found, skip this tweet
  }

  const sentiment = determineSentiment(tweet.text);
  const recommendations = [];

  // Create a recommendation for each ticker mentioned
  for (const ticker of tickers) {
    recommendations.push({
      tweet_id: tweet.id,
      handle: tweet.author.userName,
      ticker: ticker,
      sentiment: sentiment,
      mentioned_at: new Date(tweet.createdAt).toISOString(),
      tweet_text: tweet.text,
      tweet_url: tweet.url,
      created_at: new Date().toISOString()
    });
  }

  return recommendations;
}

/**
 * Main normalization function
 */
async function main() {
  console.log('[Normalize] ===============================================');
  console.log('[Normalize] Normalizing real Twitter data');
  console.log('[Normalize] ===============================================\n');

  // Read raw tweets
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('[Normalize] ❌ Error: raw_tweets.json not found.');
    console.error('[Normalize] Run npm run sim:extract:real first.');
    process.exit(1);
  }

  const rawTweets = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`[Normalize] Read ${rawTweets.length} tweets from ${INPUT_FILE}`);

  // Normalize tweets
  const allRecommendations = [];
  let tweetsWithTickers = 0;

  for (const tweet of rawTweets) {
    const recommendations = normalizeTweet(tweet);
    if (recommendations.length > 0) {
      tweetsWithTickers++;
      allRecommendations.push(...recommendations);
    }
  }

  console.log(`[Normalize] Found ${tweetsWithTickers} tweets with tickers`);
  console.log(`[Normalize] Extracted ${allRecommendations.length} total recommendations`);

  // Group by sentiment
  const bullish = allRecommendations.filter(r => r.sentiment === 'bullish');
  const bearish = allRecommendations.filter(r => r.sentiment === 'bearish');

  console.log(`[Normalize] Bullish: ${bullish.length}, Bearish: ${bearish.length}`);

  // Save to JSONL format
  const jsonlLines = allRecommendations.map(rec => JSON.stringify(rec)).join('\n');
  fs.writeFileSync(OUTPUT_FILE, jsonlLines);

  console.log(`\n[Normalize] ✅ Saved ${allRecommendations.length} recommendations to ${OUTPUT_FILE}`);

  // Display sample
  if (allRecommendations.length > 0) {
    console.log('\n[Normalize] Sample recommendation:');
    console.log(JSON.stringify(allRecommendations[0], null, 2));
  }

  // Display ticker breakdown
  const tickerCounts = {};
  allRecommendations.forEach(rec => {
    tickerCounts[rec.ticker] = (tickerCounts[rec.ticker] || 0) + 1;
  });

  console.log('\n[Normalize] Ticker breakdown:');
  Object.entries(tickerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([ticker, count]) => {
      console.log(`  $${ticker}: ${count} mentions`);
    });
}

// Run normalization
main().catch(err => {
  console.error('[Normalize] ❌ Fatal error:', err);
  process.exit(1);
});
