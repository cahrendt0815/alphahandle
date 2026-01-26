/**
 * Tweet-based provider for Fintwit Performance
 * Uses local 2-stage tweet fetching + prefiltering + bullish sentiment analysis
 * @module services/providers/tweetProvider
 */

import { getFilteredTweetsForHandle } from '../handleSearch';
import { loadCompanies, findMatchingCompany } from '../../api/prefilter';
import { batchFetchPrices, getDividends } from '../../lib/marketClient';
import { isBullishOn } from '../../utils/sentimentAnalysis';

/** @typedef {import('../../types/analysis').AnalysisResult} AnalysisResult */

/**
 * Fetches filtered tweets and converts them to analysis format
 * Uses the 2-stage fetch strategy (cashtags + recent window) + local prefilter
 *
 * @param {string} handle - Twitter handle (with or without @)
 * @param {object} options - Optional parameters
 * @param {number} options.limit - Max tweets to analyze (default: 100)
 * @param {number} options.timelineMonths - Months of history to fetch (12/24/36 based on plan)
 * @returns {Promise<AnalysisResult>} - Performance analysis result
 */
export async function fetchTweetAnalysis(handle, options = {}) {
  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const timelineMonths = options.timelineMonths || 12; // Default to Ape plan

  console.log(`[tweetProvider] Fetching tweets for ${normalizedHandle} (${timelineMonths} months timeline)`);

  try {
    // Use our new 2-stage fetch + prefilter system
    const { kept, scanned } = await getFilteredTweetsForHandle(
      normalizedHandle,
      {
        maxCount: options.limit || 100,
        timelineMonths: timelineMonths
      }
    );

    console.log(`[tweetProvider] Found ${kept.length} stock mentions from ${scanned} tweets`);

    // Load companies once for ticker extraction
    const companies = loadCompanies();

    // Extract tickers from tweets and filter for bullish sentiment
    const tweetsWithTickers = kept.slice(0, 10)
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
        if (!bullish) {
          console.log(`[tweetProvider] Filtered out non-bullish tweet for ${ticker}`);
        }
        return bullish;
      });

    console.log(`[tweetProvider] After sentiment filter: ${tweetsWithTickers.length} bullish mentions`);

    // Build price requests for batch fetching
    const priceRequests = [];
    for (const { tweet, ticker } of tweetsWithTickers) {
      if (ticker !== 'UNKNOWN') {
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
    }

    console.log(`[tweetProvider] Fetching prices for ${priceRequests.length / 2} tickers...`);

    // Fetch all prices in one batch
    let priceData = [];
    try {
      priceData = await batchFetchPrices(priceRequests);
    } catch (error) {
      console.error('[tweetProvider] Error fetching prices:', error);
    }

    // Build price lookup map
    const priceMap = new Map();
    for (const priceResp of priceData) {
      const key = `${priceResp.symbol}|${priceResp.type}`;
      priceMap.set(key, priceResp);
    }

    console.log(`[tweetProvider] Price map contains ${priceMap.size} entries:`, Array.from(priceMap.keys()));

    // Fetch SPY prices for alpha calculation
    const spyRequests = tweetsWithTickers
      .filter(({ ticker }) => ticker !== 'UNKNOWN')
      .map(({ tweet }) => ({
        symbol: 'SPY',
        type: 'entry',
        tweetTimestamp: tweet.created_at || new Date().toISOString()
      }));

    // Add one latest SPY price
    if (spyRequests.length > 0) {
      spyRequests.push({ symbol: 'SPY', type: 'latest' });
    }

    let spyData = [];
    try {
      spyData = await batchFetchPrices(spyRequests);
    } catch (error) {
      console.error('[tweetProvider] Error fetching SPY prices:', error);
    }

    const spyMap = new Map();
    for (const priceResp of spyData) {
      const key = `${priceResp.symbol}|${priceResp.type}`;
      spyMap.set(key, priceResp);
    }

    // Convert tweets to trade format with real market data
    const recentTrades = tweetsWithTickers.map(({ tweet, ticker, companyName }) => {
      const entryPriceResp = priceMap.get(`${ticker}|entry`);
      const latestPriceResp = priceMap.get(`${ticker}|latest`);
      const spyEntryResp = spyMap.get(`SPY|entry`);
      const spyLatestResp = spyMap.get(`SPY|latest`);

      // Use latest price as fallback if entry price is not available
      // This happens when tweets are very recent and historical data isn't available yet
      const beginningValue = entryPriceResp?.price || latestPriceResp?.price || 0;
      const lastValue = latestPriceResp?.price || 0;

      console.log(`[tweetProvider] ${ticker}: entry=${entryPriceResp?.price}, latest=${latestPriceResp?.price}, using begin=${beginningValue}`);

      // Calculate stock return
      const stockReturn = beginningValue > 0
        ? ((lastValue - beginningValue) / beginningValue) * 100
        : 0;

      // Calculate SPY return for alpha
      const spyBeginning = spyEntryResp?.price || 0;
      const spyLast = spyLatestResp?.price || 0;
      const spyReturn = spyBeginning > 0
        ? ((spyLast - spyBeginning) / spyBeginning) * 100
        : 0;

      const alpha = stockReturn - spyReturn;

      // Determine hit or miss
      let hitOrMiss = 'Unknown';
      if (lastValue > 0 && beginningValue > 0) {
        hitOrMiss = stockReturn > 0 ? 'Hit' : 'Miss';
      }

      return {
        ticker: ticker,
        company: companyName,
        dateMentioned: tweet.created_at || new Date().toISOString(),
        tweetText: tweet.text,
        tweetId: tweet.id,
        beginningValue: beginningValue,
        lastValue: lastValue,
        dividends: 0, // TODO: Fetch dividends if needed
        adjLastValue: lastValue, // For now, same as lastValue
        stockReturn: stockReturn,
        alphaVsSPY: alpha,
        hitOrMiss: hitOrMiss,
        tweetUrl: `https://twitter.com/${normalizedHandle.replace('@', '')}/status/${tweet.id}`
      };
    });

    // Calculate aggregate stats from real data
    const validTrades = recentTrades.filter(t => t.beginningValue > 0 && t.lastValue > 0);

    const avgReturn = validTrades.length > 0
      ? validTrades.reduce((sum, t) => sum + t.stockReturn, 0) / validTrades.length
      : 0;

    const avgAlpha = validTrades.length > 0
      ? validTrades.reduce((sum, t) => sum + t.alphaVsSPY, 0) / validTrades.length
      : 0;

    const hits = validTrades.filter(t => t.hitOrMiss === 'Hit').length;
    const winRate = validTrades.length > 0 ? (hits / validTrades.length) * 100 : 0;
    const hitRatio = validTrades.length > 0 ? hits / validTrades.length : 0;

    // Find best and worst trades
    const sortedTrades = [...validTrades].sort((a, b) => b.stockReturn - a.stockReturn);
    const bestTrade = sortedTrades[0] || { ticker: 'N/A', stockReturn: 0, dateMentioned: '' };
    const worstTrade = sortedTrades[sortedTrades.length - 1] || { ticker: 'N/A', stockReturn: 0, dateMentioned: '' };

    const result = {
      handle: normalizedHandle,
      avgReturn: avgReturn,
      alpha: avgAlpha,
      hitRatio: hitRatio,
      winRate: winRate,
      bestTrade: {
        ticker: bestTrade.ticker,
        return: `${bestTrade.stockReturn.toFixed(1)}%`,
        date: bestTrade.dateMentioned
      },
      worstTrade: {
        ticker: worstTrade.ticker,
        return: `${worstTrade.stockReturn.toFixed(1)}%`,
        date: worstTrade.dateMentioned
      },
      lastUpdated: 'Just now',
      recentTrades: recentTrades,
      tweetsScanned: scanned,
      stockMentions: kept.length,
      dataSource: 'tweets-local'
    };

    console.log(`[tweetProvider] Analysis complete: ${result.recentTrades.length} trades from ${kept.length} stock mentions`);

    return result;
  } catch (error) {
    console.error('[tweetProvider] Error:', error);

    // Return empty result instead of throwing
    return {
      handle: normalizedHandle,
      avgReturn: 0,
      alpha: 0,
      hitRatio: 0,
      winRate: 0,
      bestTrade: { ticker: 'N/A', return: '0%', date: '' },
      worstTrade: { ticker: 'N/A', return: '0%', date: '' },
      lastUpdated: 'Error',
      recentTrades: [],
      tweetsScanned: 0,
      stockMentions: 0,
      dataSource: 'tweets-local-error',
      error: error.message
    };
  }
}


 
