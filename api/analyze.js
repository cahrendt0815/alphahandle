/**
 * Serverless API endpoint for analyzing Twitter handles
 * Vercel/Netlify compatible
 *
 * GET /api/analyze?handle=@username&limit=100&since=2025-01-01
 */

import yahooFinance from 'yahoo-finance2';

// TODO: Implement Twitter API integration when credentials are available
// For now, this will return a structure that the real provider can use

// Simple in-memory cache (per lambda instance)
const priceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get historical close price for a symbol on or after a date
 */
async function getCloseOnOrAfter(symbol, date) {
  const cacheKey = `${symbol}-${date.toISOString()}`;

  if (priceCache.has(cacheKey)) {
    const cached = priceCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value;
    }
  }

  try {
    const queryStartDate = new Date(date);
    queryStartDate.setDate(queryStartDate.getDate() - 1); // Start 1 day before

    const queryEndDate = new Date(date);
    queryEndDate.setDate(queryEndDate.getDate() + 7); // Look ahead 7 days

    const result = await yahooFinance.historical(symbol, {
      period1: queryStartDate,
      period2: queryEndDate,
      interval: '1d'
    });

    if (!result || result.length === 0) {
      return null;
    }

    // Find first close on or after target date
    const targetTime = date.getTime();
    const match = result.find(quote => new Date(quote.date).getTime() >= targetTime);

    const price = match?.close || result[result.length - 1]?.close || null;

    priceCache.set(cacheKey, { value: price, timestamp: Date.now() });
    return price;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get latest close price for a symbol
 */
async function getLatestClose(symbol) {
  const cacheKey = `${symbol}-latest`;

  if (priceCache.has(cacheKey)) {
    const cached = priceCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value;
    }
  }

  try {
    const quote = await yahooFinance.quote(symbol);
    const price = quote?.regularMarketPrice || null;

    if (price) {
      priceCache.set(cacheKey, { value: price, timestamp: Date.now() });
    }

    return price;
  } catch (error) {
    console.error(`Error fetching latest price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get company name for a symbol
 */
async function getCompanyName(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    return quote?.longName || quote?.shortName || symbol;
  } catch (error) {
    return symbol;
  }
}

/**
 * Calculate S&P 500 return over a period
 */
async function getSPYReturn(startDate, endDate) {
  try {
    const result = await yahooFinance.historical('^GSPC', {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });

    if (!result || result.length < 2) {
      return 0;
    }

    const firstClose = result[0].close;
    const lastClose = result[result.length - 1].close;

    return ((lastClose - firstClose) / firstClose) * 100;
  } catch (error) {
    console.error('Error fetching SPY return:', error.message);
    return 0;
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { handle, limit = '100', since } = req.query;

    if (!handle) {
      return res.status(400).json({ error: 'Missing required parameter: handle' });
    }

    // TODO: Replace with actual Twitter API integration
    // For now, return a response indicating Twitter API is not yet integrated

    console.log(`[API] Analyzing handle: ${handle}, limit: ${limit}, since: ${since}`);

    // Return a structured response that indicates real API needs Twitter credentials
    return res.status(503).json({
      error: 'Twitter API integration pending',
      message: 'Set TWITTER_API_KEY environment variable to enable real analysis',
      handle: handle,
      requiresSetup: true
    });

    // TODO: When Twitter API is available, implement:
    // 1. Fetch tweets from Twitter API
    // 2. Extract tickers using analysisHelpers
    // 3. Fetch prices using Yahoo Finance
    // 4. Calculate returns and alpha
    // 5. Return AnalysisResult structure

  } catch (error) {
    console.error('[API] Error:', error);
    return res.status(502).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
}

// Vercel serverless function config
export const config = {
  maxDuration: 60, // 60 seconds max execution time
};
