/**
 * Incremental Analysis Service
 * Fetches and processes tweets in batches, yielding results incrementally
 * Expands time window automatically until reaching target trade count or plan limit
 */

import { getFilteredTweetsForHandle } from './handleSearch';
import { loadCompanies, findMatchingCompany } from '../api/prefilter';
import { batchFetchPrices } from '../lib/marketClient';
import { isBullishOn } from '../utils/sentimentAnalysis';
import { saveAnalysis } from '../utils/supabaseClient';

/**
 * Process tweets in batches and yield results incrementally
 * Fetches all tweets from the user's plan timeline and processes them in batches
 *
 * @param {string} handle - Twitter handle
 * @param {object} options - Configuration options
 * @param {number} options.timelineMonths - Months of history (based on user plan: 12, 24, or 36)
 * @param {number} options.batchSize - Tweets to process per batch
 * @param {function} options.onBatchComplete - Callback with results after each batch
 * @returns {Promise<object>} - Final aggregated results
 */
export async function analyzeHandleIncremental(handle, options = {}) {
  const {
    timelineMonths = 12,
    batchSize = 50,
    onBatchComplete = null
  } = options;

  console.log(`[IncrementalAnalysis] Starting analysis for ${handle}`);
  console.log(`[IncrementalAnalysis] Plan timeline: ${timelineMonths} months, Batch size: ${batchSize}`);

  // Load companies once for all batches
  const companies = loadCompanies();

  // Fetch ALL tweets from the user's plan timeline (12, 24, or 36 months)
  console.log(`[IncrementalAnalysis] Fetching tweets from last ${timelineMonths} months...`);
  const { kept, scanned } = await getFilteredTweetsForHandle(handle, {
    maxCount: 10000,
    timelineMonths
  });

  console.log(`[IncrementalAnalysis] Found ${kept.length} stock-related tweets from ${scanned} total`);

  // Accumulated results
  let allTrades = [];

  // Process all tweets in batches
  let batchNumber = 0;
  for (let i = 0; i < kept.length; i += batchSize) {
    const batch = kept.slice(i, i + batchSize);
    batchNumber++;

    console.log(`[IncrementalAnalysis] Processing batch ${batchNumber}: tweets ${i}-${i + batch.length}`);

    try {
      // Process this batch
      const batchResults = await processTweetBatch(batch, companies, handle);

      // Add new trades
      allTrades.push(...batchResults);

      // Calculate current aggregated stats
      const currentStats = calculateStats(allTrades);

      // Notify caller with current results
      if (onBatchComplete) {
        onBatchComplete({
          batchNumber,
          totalBatches: Math.ceil(kept.length / batchSize),
          tweetsProcessed: i + batch.length,
          totalTweets: kept.length,
          tradesFound: allTrades.length,
          recentTrades: allTrades, // All trades so far
          stats: currentStats,
          isComplete: i + batch.length >= kept.length,
          currentTimeWindow: timelineMonths,
          maxTimeWindow: timelineMonths
        });
      }

      // Small delay between batches to avoid overwhelming APIs
      if (i + batch.length < kept.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`[IncrementalAnalysis] Error processing batch ${batchNumber}:`, error);
      // Continue with next batch even if one fails
    }
  }

  console.log(`[IncrementalAnalysis] Completed: ${allTrades.length} trades found from ${kept.length} stock tweets`);

  // Calculate final stats
  const finalStats = calculateStats(allTrades);

  const finalResult = {
    ...finalStats,
    recentTrades: allTrades,
    totalTweets: scanned,
    stockTweets: kept.length,
    handle: handle
  };

  // Cache final results in Supabase
  try {
    await saveAnalysis(handle.replace('@', ''), finalResult, timelineMonths);
    console.log(`[IncrementalAnalysis] Cached results for ${handle}`);
  } catch (error) {
    console.error('[IncrementalAnalysis] Error caching results:', error);
  }

  console.log(`[IncrementalAnalysis] Final results: ${allTrades.length} trades from ${kept.length} stock tweets`);

  return finalResult;
}

/**
 * Process a batch of tweets into trade objects
 */
async function processTweetBatch(tweets, companies, handle) {
  // Extract tickers and filter for bullish sentiment
  const tweetsWithTickers = tweets
    .map((tweet) => {
      const matchedCompany = findMatchingCompany(tweet.text, companies);
      return {
        tweet,
        ticker: matchedCompany ? matchedCompany.ticker : 'UNKNOWN',
        companyName: matchedCompany ? matchedCompany.name : 'UNKNOWN Inc.'
      };
    })
    .filter(({ tweet, ticker, companyName }) => {
      // Skip unknown tickers
      if (ticker === 'UNKNOWN') return false;

      // Only include tweets with clear bullish sentiment
      const bullish = isBullishOn(tweet.text, ticker, companyName);
      return bullish;
    });

  if (tweetsWithTickers.length === 0) {
    return [];
  }

  // Build price requests for batch fetching
  const priceRequests = [];
  for (const { tweet, ticker } of tweetsWithTickers) {
    // Entry price (at time of tweet)
    priceRequests.push({
      symbol: ticker,
      type: 'entry',
      tweetTimestamp: tweet.created_at || new Date().toISOString()
    });
    // Latest price (current)
    priceRequests.push({
      symbol: ticker,
      type: 'latest'
    });
  }

  // Fetch all prices in one batch
  let priceData = [];
  try {
    priceData = await batchFetchPrices(priceRequests);
  } catch (error) {
    console.error('[IncrementalAnalysis] Error fetching prices:', error);
    return [];
  }

  // Build price lookup map
  const priceMap = new Map();
  for (const priceResp of priceData) {
    const key = `${priceResp.symbol}|${priceResp.type}`;
    priceMap.set(key, priceResp.price);
  }

  // Build trade objects
  const trades = [];
  for (const { tweet, ticker, companyName } of tweetsWithTickers) {
    let entryPrice = priceMap.get(`${ticker}|entry`);
    const latestPrice = priceMap.get(`${ticker}|latest`);

    // If entry price is missing (e.g., tweet from today), use latest price as fallback
    if (!entryPrice && latestPrice) {
      console.log(`[IncrementalAnalysis] Using latest price as entry for same-day tweet ${ticker}`);
      entryPrice = latestPrice;
    }

    if (!entryPrice || !latestPrice) {
      console.warn(`[IncrementalAnalysis] Missing price data for ${ticker}`);
      continue;
    }

    const stockReturn = ((latestPrice - entryPrice) / entryPrice) * 100;

    trades.push({
      id: tweet.id,
      ticker: ticker,
      company: companyName,
      tweetText: tweet.text.substring(0, 200), // Truncate for storage
      dateMentioned: tweet.created_at,
      tweetDate: tweet.created_at,
      tweetUrl: `https://twitter.com/i/web/status/${tweet.id}`,
      beginningValue: parseFloat(entryPrice.toFixed(2)),
      lastValue: parseFloat(latestPrice.toFixed(2)),
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      currentPrice: parseFloat(latestPrice.toFixed(2)),
      stockReturn: parseFloat(stockReturn.toFixed(2)),
      alphaVsSPY: parseFloat(stockReturn.toFixed(2)), // Simplified alpha calculation
      alpha: 0, // Will calculate after we have SPY benchmark
      dividends: 0,
      chartData: [] // Empty chart data for now
    });
  }

  return trades;
}

/**
 * Calculate aggregated statistics from trades
 */
function calculateStats(trades) {
  if (trades.length === 0) {
    return {
      avgReturn: 0,
      alpha: 0,
      winRate: 0,
      hitRatio: 0,
      bestTrade: null,
      worstTrade: null,
      totalTrades: 0
    };
  }

  // Calculate metrics
  const returns = trades.map(t => t.stockReturn);
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  const winners = trades.filter(t => t.stockReturn > 0);
  const winRate = (winners.length / trades.length) * 100;

  const bestTrade = trades.reduce((best, t) =>
    t.stockReturn > (best?.stockReturn || -Infinity) ? t : best
  , null);

  const worstTrade = trades.reduce((worst, t) =>
    t.stockReturn < (worst?.stockReturn || Infinity) ? t : worst
  , null);

  // Hit ratio: % of trades beating SPY (simplified - assume SPY ~10% annual)
  const spyBenchmark = 10;
  const beatsMarket = trades.filter(t => t.stockReturn > spyBenchmark);
  const hitRatio = (beatsMarket.length / trades.length) * 100;

  return {
    avgReturn: parseFloat(avgReturn.toFixed(2)),
    alpha: parseFloat((avgReturn - spyBenchmark).toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    hitRatio: parseFloat(hitRatio.toFixed(1)),
    bestTrade,
    worstTrade,
    totalTrades: trades.length
  };
}
