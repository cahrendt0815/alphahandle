/**
 * Mock data provider for Fintwit Performance
 * Returns realistic mock data matching the AnalysisResult type
 * @module services/providers/mockProvider
 */

/** @typedef {import('../../types/analysis').AnalysisResult} AnalysisResult */

const MOCK_PROFILES = {
  '@elonmusk': {
    handle: '@elonmusk',
    avgReturn: 12.5,      // Average of all stock returns
    alpha: 10.8,          // Average of all alphas
    hitRatio: 60.0,       // 3 hits out of 5
    winRate: 60.0,        // 3 wins out of 5
    bestTrade: { ticker: '$TSLA', return: '+18.7%', date: '2024-12-10' },
    worstTrade: { ticker: '$DOGE', return: '-11.4%', date: '2024-11-28' },
    lastUpdated: '3 hours ago',
    recentTrades: [
      {
        ticker: '$TSLA',
        company: 'Tesla Inc.',
        dateMentioned: '2025-01-15',
        beginningValue: 242.84,
        lastValue: 273.14,
        dividends: 0,
        adjLastValue: 273.14,
        stockReturn: 12.5,           // (273.14 / 242.84) - 1
        alphaVsSPY: 11.3,            // 12.5 - 1.2 (SPY return)
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/elonmusk/status/1234567890'
      },
      {
        ticker: '$NVDA',
        company: 'NVIDIA Corporation',
        dateMentioned: '2025-01-08',
        beginningValue: 512.30,
        lastValue: 554.85,
        dividends: 0,
        adjLastValue: 554.85,
        stockReturn: 8.3,
        alphaVsSPY: 7.5,             // 8.3 - 0.8
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/elonmusk/status/1234567891'
      },
      {
        ticker: '$BTC',
        company: 'Bitcoin',
        dateMentioned: '2024-12-20',
        beginningValue: 98420.00,
        lastValue: 93300.00,
        dividends: 0,
        adjLastValue: 93300.00,
        stockReturn: -5.2,
        alphaVsSPY: -7.3,            // -5.2 - 2.1
        hitOrMiss: 'Miss',
        tweetUrl: 'https://x.com/elonmusk/status/1234567892'
      },
      {
        ticker: '$TSLA',
        company: 'Tesla Inc.',
        dateMentioned: '2024-12-10',
        beginningValue: 225.50,
        lastValue: 267.64,
        dividends: 0,
        adjLastValue: 267.64,
        stockReturn: 18.7,
        alphaVsSPY: 17.2,            // 18.7 - 1.5
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/elonmusk/status/1234567893'
      },
      {
        ticker: '$DOGE',
        company: 'Dogecoin',
        dateMentioned: '2024-11-28',
        beginningValue: 0.42,
        lastValue: 0.37,
        dividends: 0,
        adjLastValue: 0.37,
        stockReturn: -11.4,
        alphaVsSPY: -12.0,           // -11.4 - 0.6
        hitOrMiss: 'Miss',
        tweetUrl: 'https://x.com/elonmusk/status/1234567894'
      },
    ]
  },
  '@chamath': {
    handle: '@chamath',
    avgReturn: 16.4,
    alpha: 15.2,
    hitRatio: 80.0,
    winRate: 80.0,
    bestTrade: { ticker: '$SOFI', return: '+28.6%', date: '2024-11-30' },
    worstTrade: { ticker: '$RBLX', return: '-3.2%', date: '2024-12-15' },
    lastUpdated: '1 hour ago',
    recentTrades: [
      {
        ticker: '$SOFI',
        company: 'SoFi Technologies Inc.',
        dateMentioned: '2025-01-18',
        beginningValue: 8.42,
        lastValue: 10.28,
        dividends: 0,
        adjLastValue: 10.28,
        stockReturn: 22.1,
        alphaVsSPY: 20.4,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/chamath/status/2234567890'
      },
      {
        ticker: '$COIN',
        company: 'Coinbase Global Inc.',
        dateMentioned: '2025-01-10',
        beginningValue: 185.40,
        lastValue: 214.70,
        dividends: 0,
        adjLastValue: 214.70,
        stockReturn: 15.8,
        alphaVsSPY: 14.7,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/chamath/status/2234567891'
      },
      {
        ticker: '$HOOD',
        company: 'Robinhood Markets Inc.',
        dateMentioned: '2024-12-28',
        beginningValue: 24.85,
        lastValue: 27.19,
        dividends: 0,
        adjLastValue: 27.19,
        stockReturn: 9.4,
        alphaVsSPY: 8.5,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/chamath/status/2234567892'
      },
      {
        ticker: '$RBLX',
        company: 'Roblox Corporation',
        dateMentioned: '2024-12-15',
        beginningValue: 42.10,
        lastValue: 40.75,
        dividends: 0,
        adjLastValue: 40.75,
        stockReturn: -3.2,
        alphaVsSPY: -4.6,
        hitOrMiss: 'Miss',
        tweetUrl: 'https://x.com/chamath/status/2234567893'
      },
      {
        ticker: '$SOFI',
        company: 'SoFi Technologies Inc.',
        dateMentioned: '2024-11-30',
        beginningValue: 7.85,
        lastValue: 10.09,
        dividends: 0,
        adjLastValue: 10.09,
        stockReturn: 28.6,
        alphaVsSPY: 27.3,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/chamath/status/2234567894'
      },
    ]
  },
  '@cathiedwood': {
    handle: '@CathieDWood',
    avgReturn: 6.9,
    alpha: 5.8,
    hitRatio: 60.0,
    winRate: 60.0,
    bestTrade: { ticker: '$TSLA', return: '+14.5%', date: '2025-01-12' },
    worstTrade: { ticker: '$TDOC', return: '-12.3%', date: '2024-12-18' },
    lastUpdated: '5 hours ago',
    recentTrades: [
      {
        ticker: '$COIN',
        company: 'Coinbase Global Inc.',
        dateMentioned: '2025-01-20',
        beginningValue: 198.50,
        lastValue: 220.75,
        dividends: 0,
        adjLastValue: 220.75,
        stockReturn: 11.2,
        alphaVsSPY: 10.3,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/CathieDWood/status/3234567890'
      },
      {
        ticker: '$TSLA',
        company: 'Tesla Inc.',
        dateMentioned: '2025-01-12',
        beginningValue: 235.20,
        lastValue: 269.30,
        dividends: 0,
        adjLastValue: 269.30,
        stockReturn: 14.5,
        alphaVsSPY: 13.2,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/CathieDWood/status/3234567891'
      },
      {
        ticker: '$ROKU',
        company: 'Roku Inc.',
        dateMentioned: '2025-01-05',
        beginningValue: 78.40,
        lastValue: 71.40,
        dividends: 0,
        adjLastValue: 71.40,
        stockReturn: -8.9,
        alphaVsSPY: -10.0,
        hitOrMiss: 'Miss',
        tweetUrl: 'https://x.com/CathieDWood/status/3234567892'
      },
      {
        ticker: '$SQ',
        company: 'Block Inc.',
        dateMentioned: '2024-12-22',
        beginningValue: 82.30,
        lastValue: 87.80,
        dividends: 0.15,
        adjLastValue: 87.95,
        stockReturn: 6.7,
        alphaVsSPY: 6.0,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/CathieDWood/status/3234567893'
      },
      {
        ticker: '$TDOC',
        company: 'Teladoc Health Inc.',
        dateMentioned: '2024-12-18',
        beginningValue: 12.50,
        lastValue: 10.96,
        dividends: 0,
        adjLastValue: 10.96,
        stockReturn: -12.3,
        alphaVsSPY: -13.5,
        hitOrMiss: 'Miss',
        tweetUrl: 'https://x.com/CathieDWood/status/3234567894'
      },
    ]
  },
  '@naval': {
    handle: '@naval',
    avgReturn: 19.1,
    alpha: 17.8,
    hitRatio: 80.0,
    winRate: 80.0,
    bestTrade: { ticker: '$SOL', return: '+31.7%', date: '2024-11-28' },
    worstTrade: { ticker: '$ETH', return: '-4.1%', date: '2024-10-22' },
    lastUpdated: '2 days ago',
    recentTrades: [
      {
        ticker: '$BTC',
        company: 'Bitcoin',
        dateMentioned: '2025-01-10',
        beginningValue: 94250.00,
        lastValue: 112070.00,
        dividends: 0,
        adjLastValue: 112070.00,
        stockReturn: 18.9,
        alphaVsSPY: 17.4,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/naval/status/4234567890'
      },
      {
        ticker: '$ETH',
        company: 'Ethereum',
        dateMentioned: '2024-12-15',
        beginningValue: 3840.00,
        lastValue: 4773.12,
        dividends: 0,
        adjLastValue: 4773.12,
        stockReturn: 24.3,
        alphaVsSPY: 22.5,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/naval/status/4234567891'
      },
      {
        ticker: '$SOL',
        company: 'Solana',
        dateMentioned: '2024-11-28',
        beginningValue: 142.30,
        lastValue: 187.40,
        dividends: 0,
        adjLastValue: 187.40,
        stockReturn: 31.7,
        alphaVsSPY: 30.9,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/naval/status/4234567892'
      },
      {
        ticker: '$BTC',
        company: 'Bitcoin',
        dateMentioned: '2024-11-10',
        beginningValue: 88500.00,
        lastValue: 99468.00,
        dividends: 0,
        adjLastValue: 99468.00,
        stockReturn: 12.4,
        alphaVsSPY: 11.1,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/naval/status/4234567893'
      },
      {
        ticker: '$ETH',
        company: 'Ethereum',
        dateMentioned: '2024-10-22',
        beginningValue: 3920.00,
        lastValue: 3759.32,
        dividends: 0,
        adjLastValue: 3759.32,
        stockReturn: -4.1,
        alphaVsSPY: -4.7,
        hitOrMiss: 'Miss',
        tweetUrl: 'https://x.com/naval/status/4234567894'
      },
    ]
  },
  '@arkinvest': {
    handle: '@ARKInvest',
    avgReturn: 8.1,
    alpha: 7.0,
    hitRatio: 60.0,
    winRate: 60.0,
    bestTrade: { ticker: '$TSLA', return: '+16.8%', date: '2025-01-19' },
    worstTrade: { ticker: '$TDOC', return: '-14.5%', date: '2024-12-20' },
    lastUpdated: '1 day ago',
    recentTrades: [
      {
        ticker: '$TSLA',
        company: 'Tesla Inc.',
        dateMentioned: '2025-01-19',
        beginningValue: 228.40,
        lastValue: 266.80,
        dividends: 0,
        adjLastValue: 266.80,
        stockReturn: 16.8,
        alphaVsSPY: 15.4,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/ARKInvest/status/5234567890'
      },
      {
        ticker: '$COIN',
        company: 'Coinbase Global Inc.',
        dateMentioned: '2025-01-14',
        beginningValue: 192.50,
        lastValue: 217.90,
        dividends: 0,
        adjLastValue: 217.90,
        stockReturn: 13.2,
        alphaVsSPY: 12.0,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/ARKInvest/status/5234567891'
      },
      {
        ticker: '$ROKU',
        company: 'Roku Inc.',
        dateMentioned: '2025-01-08',
        beginningValue: 82.60,
        lastValue: 77.31,
        dividends: 0,
        adjLastValue: 77.31,
        stockReturn: -6.4,
        alphaVsSPY: -7.3,
        hitOrMiss: 'Miss',
        tweetUrl: 'https://x.com/ARKInvest/status/5234567892'
      },
      {
        ticker: '$SQ',
        company: 'Block Inc.',
        dateMentioned: '2024-12-30',
        beginningValue: 78.90,
        lastValue: 86.08,
        dividends: 0.12,
        adjLastValue: 86.20,
        stockReturn: 9.1,
        alphaVsSPY: 8.3,
        hitOrMiss: 'Hit',
        tweetUrl: 'https://x.com/ARKInvest/status/5234567893'
      },
      {
        ticker: '$TDOC',
        company: 'Teladoc Health Inc.',
        dateMentioned: '2024-12-20',
        beginningValue: 13.20,
        lastValue: 11.29,
        dividends: 0,
        adjLastValue: 11.29,
        stockReturn: -14.5,
        alphaVsSPY: -15.6,
        hitOrMiss: 'Miss',
        tweetUrl: 'https://x.com/ARKInvest/status/5234567894'
      },
    ]
  }
};

// Default profile for unknown handles
const DEFAULT_PROFILE = {
  handle: '@unknown',
  avgReturn: 4.2,
  alpha: 3.3,
  hitRatio: 60.0,
  winRate: 60.0,
  bestTrade: { ticker: '$AMZN', return: '+11.4%', date: '2024-12-15' },
  worstTrade: { ticker: '$META', return: '-9.2%', date: '2024-11-30' },
  lastUpdated: '12 hours ago',
  recentTrades: [
    {
      ticker: '$AAPL',
      company: 'Apple Inc.',
      dateMentioned: '2025-01-16',
      beginningValue: 185.50,
      lastValue: 198.86,
      dividends: 0.25,
      adjLastValue: 199.11,
      stockReturn: 7.2,
      alphaVsSPY: 6.3,
      hitOrMiss: 'Hit',
      tweetUrl: 'https://x.com/unknown/status/6234567890'
    },
    {
      ticker: '$MSFT',
      company: 'Microsoft Corporation',
      dateMentioned: '2025-01-09',
      beginningValue: 415.20,
      lastValue: 436.38,
      dividends: 0.75,
      adjLastValue: 437.13,
      stockReturn: 5.1,
      alphaVsSPY: 4.1,
      hitOrMiss: 'Hit',
      tweetUrl: 'https://x.com/unknown/status/6234567891'
    },
    {
      ticker: '$GOOGL',
      company: 'Alphabet Inc.',
      dateMentioned: '2024-12-28',
      beginningValue: 142.80,
      lastValue: 137.37,
      dividends: 0,
      adjLastValue: 137.37,
      stockReturn: -3.8,
      alphaVsSPY: -4.6,
      hitOrMiss: 'Miss',
      tweetUrl: 'https://x.com/unknown/status/6234567892'
    },
    {
      ticker: '$AMZN',
      company: 'Amazon.com Inc.',
      dateMentioned: '2024-12-15',
      beginningValue: 178.30,
      lastValue: 198.62,
      dividends: 0,
      adjLastValue: 198.62,
      stockReturn: 11.4,
      alphaVsSPY: 10.2,
      hitOrMiss: 'Hit',
      tweetUrl: 'https://x.com/unknown/status/6234567893'
    },
    {
      ticker: '$META',
      company: 'Meta Platforms Inc.',
      dateMentioned: '2024-11-30',
      beginningValue: 352.60,
      lastValue: 320.16,
      dividends: 0,
      adjLastValue: 320.16,
      stockReturn: -9.2,
      alphaVsSPY: -9.9,
      hitOrMiss: 'Miss',
      tweetUrl: 'https://x.com/unknown/status/6234567894'
    },
  ]
};

/**
 * Fetches mock performance data for a Twitter handle
 * @param {string} handle - Twitter handle (with or without @)
 * @returns {Promise<AnalysisResult>} - Performance analysis result
 */
export async function fetchMockAnalysis(handle) {
  return new Promise((resolve) => {
    // Simulate network delay (2 seconds)
    setTimeout(() => {
      // Normalize handle (add @ if missing, convert to lowercase)
      const normalizedHandle = handle.toLowerCase().startsWith('@')
        ? handle.toLowerCase()
        : `@${handle.toLowerCase()}`;

      // Find matching profile or use default
      const profile = MOCK_PROFILES[normalizedHandle] || {
        ...DEFAULT_PROFILE,
        handle: normalizedHandle
      };

      resolve(profile);
    }, 2000);
  });
}
