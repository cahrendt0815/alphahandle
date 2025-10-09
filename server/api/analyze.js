/**
 * Serverless API endpoint for analyzing Twitter handles
 * Keeps API keys secure on server-side only
 *
 * Deploy this function to Vercel, Netlify, or similar serverless platform
 * Set TWITTER_API_KEY environment variable in deployment settings
 *
 * @param {Request} req - HTTP request
 * @param {Response} res - HTTP response
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get handle from query parameter
  const { handle } = req.query;

  if (!handle) {
    return res.status(400).json({ error: 'Missing handle parameter' });
  }

  // Get API key from environment (server-side only)
  const apiKey = process.env.TWITTER_API_KEY;

  if (!apiKey) {
    console.error('[API] TWITTER_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`[API] Analyzing handle: ${handle}`);

    // TODO: Replace with actual twitterapi.io endpoint
    // Example endpoint structure (adjust to match twitterapi.io spec):
    // GET https://api.twitterapi.io/v2/users/{username}/tweets
    // Headers: Authorization: Bearer {apiKey}

    const apiUrl = `https://api.twitterapi.io/v2/users/${handle}/tweets?limit=100`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Twitter API request failed: ${response.status} ${response.statusText}`);
    }

    const tweets = await response.json();

    // TODO: Parse tweets and extract stock recommendations
    // This is a placeholder implementation - replace with actual logic
    const analysis = parseTwitterData(handle, tweets);

    console.log(`[API] Successfully analyzed handle: ${handle}`);
    return res.status(200).json(analysis);

  } catch (error) {
    console.error(`[API] Error analyzing handle ${handle}:`, error);
    return res.status(500).json({
      error: 'Failed to analyze handle',
      message: error.message
    });
  }
}

/**
 * Parse Twitter data and extract stock recommendations
 * TODO: Implement actual parsing logic
 *
 * @param {string} handle - Twitter handle
 * @param {Object} tweets - Raw tweets data from API
 * @returns {Object} - Formatted AnalysisResult
 */
function parseTwitterData(handle, tweets) {
  // TODO: Implement actual parsing logic
  // For now, return a placeholder structure

  // Extract stock mentions from tweets
  // Look for patterns like $TICKER, or explicit "buy/sell" mentions
  // Calculate entry/exit prices (may need additional market data API)
  // Compute returns and outcomes
  // Calculate benchmark (S&P 500) returns for same periods

  console.warn('[API] Using placeholder parsing logic - implement actual tweet analysis');

  return {
    handle: `@${handle}`,
    totalRecommendations: 0,
    accuracy: 0,
    avgReturn: '0%',
    winRate: 0,
    bestTrade: { ticker: 'N/A', return: '0%', date: '2025-01-01' },
    worstTrade: { ticker: 'N/A', return: '0%', date: '2025-01-01' },
    lastUpdated: 'Just now',
    recentTrades: [
      // TODO: Parse tweets and populate with actual recommendations
      // Each trade should include:
      // - date (YYYY-MM-DD)
      // - company (full name - may need symbol lookup API)
      // - ticker (from $TICKER mentions)
      // - type (Buy/Sell/Hold - infer from tweet text)
      // - direction (Long/Short - infer from context)
      // - entryPrice (from market data API at tweet date)
      // - exitPrice (current price or price at exit mention)
      // - returnPct (calculated)
      // - outcome (Win/Loss based on return)
      // - benchmarkPct (S&P 500 return over same period)
      // - tweetUrl (construct from tweet ID)
    ]
  };
}

// Helper function to extract stock tickers from tweet text
function extractTickers(text) {
  const tickerRegex = /\$([A-Z]{1,5})\b/g;
  const matches = [...text.matchAll(tickerRegex)];
  return matches.map(m => m[1]);
}

// Helper function to infer trade type from tweet text
function inferTradeType(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('buy') || lowerText.includes('buying')) return 'Buy';
  if (lowerText.includes('sell') || lowerText.includes('selling')) return 'Sell';
  if (lowerText.includes('hold') || lowerText.includes('holding')) return 'Hold';
  return 'Buy'; // Default to Buy if unclear
}
