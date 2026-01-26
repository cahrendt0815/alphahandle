// Mock API for simulating performance data fetching
// Returns fake but realistic data after a delay to simulate API call

const MOCK_PROFILES = {
  '@elonmusk': {
    handle: '@elonmusk',
    totalRecommendations: 124,
    accuracy: 68,
    avgReturn: '+24.5%',
    winRate: 68,
    bestTrade: { ticker: 'TSLA', return: '+54.2%', date: '2024-03-15' },
    worstTrade: { ticker: 'DOGE', return: '-22.1%', date: '2024-06-22' },
    lastUpdated: '3 hours ago',
    recentTrades: [
      {
        date: '2025-01-15',
        company: 'Tesla Inc.',
        ticker: 'TSLA',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 242.84,
        exitPrice: 273.14,
        returnPct: 12.5,
        outcome: 'Win',
        benchmarkPct: 1.2,
        tweetUrl: 'https://x.com/elonmusk/status/1234567890'
      },
      {
        date: '2025-01-08',
        company: 'NVIDIA Corporation',
        ticker: 'NVDA',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 512.30,
        exitPrice: 554.85,
        returnPct: 8.3,
        outcome: 'Win',
        benchmarkPct: 0.8,
        tweetUrl: 'https://x.com/elonmusk/status/1234567891'
      },
      {
        date: '2024-12-20',
        company: 'Bitcoin',
        ticker: 'BTC',
        type: 'Hold',
        direction: 'Long',
        entryPrice: 98420.00,
        exitPrice: 93300.00,
        returnPct: -5.2,
        outcome: 'Loss',
        benchmarkPct: 2.1,
        tweetUrl: 'https://x.com/elonmusk/status/1234567892'
      },
      {
        date: '2024-12-10',
        company: 'Tesla Inc.',
        ticker: 'TSLA',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 225.50,
        exitPrice: 267.64,
        returnPct: 18.7,
        outcome: 'Win',
        benchmarkPct: 1.5,
        tweetUrl: 'https://x.com/elonmusk/status/1234567893'
      },
      {
        date: '2024-11-28',
        company: 'Dogecoin',
        ticker: 'DOGE',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 0.42,
        exitPrice: 0.37,
        returnPct: -11.4,
        outcome: 'Loss',
        benchmarkPct: 0.6,
        tweetUrl: 'https://x.com/elonmusk/status/1234567894'
      },
    ]
  },
  '@chamath': {
    handle: '@chamath',
    totalRecommendations: 89,
    accuracy: 74,
    avgReturn: '+31.8%',
    winRate: 74,
    bestTrade: { ticker: 'SOFI', return: '+92.3%', date: '2024-02-10' },
    worstTrade: { ticker: 'OPEN', return: '-34.5%', date: '2024-08-15' },
    lastUpdated: '1 hour ago',
    recentTrades: [
      {
        date: '2025-01-18',
        company: 'SoFi Technologies Inc.',
        ticker: 'SOFI',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 8.42,
        exitPrice: 10.28,
        returnPct: 22.1,
        outcome: 'Win',
        benchmarkPct: 1.7,
        tweetUrl: 'https://x.com/chamath/status/2234567890'
      },
      {
        date: '2025-01-10',
        company: 'Coinbase Global Inc.',
        ticker: 'COIN',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 185.40,
        exitPrice: 214.70,
        returnPct: 15.8,
        outcome: 'Win',
        benchmarkPct: 1.1,
        tweetUrl: 'https://x.com/chamath/status/2234567891'
      },
      {
        date: '2024-12-28',
        company: 'Robinhood Markets Inc.',
        ticker: 'HOOD',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 24.85,
        exitPrice: 27.19,
        returnPct: 9.4,
        outcome: 'Win',
        benchmarkPct: 0.9,
        tweetUrl: 'https://x.com/chamath/status/2234567892'
      },
      {
        date: '2024-12-15',
        company: 'Roblox Corporation',
        ticker: 'RBLX',
        type: 'Hold',
        direction: 'Long',
        entryPrice: 42.10,
        exitPrice: 40.75,
        returnPct: -3.2,
        outcome: 'Loss',
        benchmarkPct: 1.4,
        tweetUrl: 'https://x.com/chamath/status/2234567893'
      },
      {
        date: '2024-11-30',
        company: 'SoFi Technologies Inc.',
        ticker: 'SOFI',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 7.85,
        exitPrice: 10.09,
        returnPct: 28.6,
        outcome: 'Win',
        benchmarkPct: 1.3,
        tweetUrl: 'https://x.com/chamath/status/2234567894'
      },
    ]
  },
  '@cathiedwood': {
    handle: '@CathieDWood',
    totalRecommendations: 156,
    accuracy: 61,
    avgReturn: '+18.2%',
    winRate: 61,
    bestTrade: { ticker: 'TSLA', return: '+68.9%', date: '2024-01-22' },
    worstTrade: { ticker: 'ROKU', return: '-41.2%', date: '2024-07-08' },
    lastUpdated: '5 hours ago',
    recentTrades: [
      {
        date: '2025-01-20',
        company: 'Coinbase Global Inc.',
        ticker: 'COIN',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 198.50,
        exitPrice: 220.75,
        returnPct: 11.2,
        outcome: 'Win',
        benchmarkPct: 0.9,
        tweetUrl: 'https://x.com/CathieDWood/status/3234567890'
      },
      {
        date: '2025-01-12',
        company: 'Tesla Inc.',
        ticker: 'TSLA',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 235.20,
        exitPrice: 269.30,
        returnPct: 14.5,
        outcome: 'Win',
        benchmarkPct: 1.3,
        tweetUrl: 'https://x.com/CathieDWood/status/3234567891'
      },
      {
        date: '2025-01-05',
        company: 'Roku Inc.',
        ticker: 'ROKU',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 78.40,
        exitPrice: 71.40,
        returnPct: -8.9,
        outcome: 'Loss',
        benchmarkPct: 1.1,
        tweetUrl: 'https://x.com/CathieDWood/status/3234567892'
      },
      {
        date: '2024-12-22',
        company: 'Block Inc.',
        ticker: 'SQ',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 82.30,
        exitPrice: 87.80,
        returnPct: 6.7,
        outcome: 'Win',
        benchmarkPct: 0.7,
        tweetUrl: 'https://x.com/CathieDWood/status/3234567893'
      },
      {
        date: '2024-12-18',
        company: 'Teladoc Health Inc.',
        ticker: 'TDOC',
        type: 'Hold',
        direction: 'Long',
        entryPrice: 12.50,
        exitPrice: 10.96,
        returnPct: -12.3,
        outcome: 'Loss',
        benchmarkPct: 1.2,
        tweetUrl: 'https://x.com/CathieDWood/status/3234567894'
      },
    ]
  },
  '@naval': {
    handle: '@naval',
    totalRecommendations: 47,
    accuracy: 81,
    avgReturn: '+42.7%',
    winRate: 81,
    bestTrade: { ticker: 'BTC', return: '+127.4%', date: '2024-03-01' },
    worstTrade: { ticker: 'ETH', return: '-15.8%', date: '2024-09-12' },
    lastUpdated: '2 days ago',
    recentTrades: [
      {
        date: '2025-01-10',
        company: 'Bitcoin',
        ticker: 'BTC',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 94250.00,
        exitPrice: 112070.00,
        returnPct: 18.9,
        outcome: 'Win',
        benchmarkPct: 1.5,
        tweetUrl: 'https://x.com/naval/status/4234567890'
      },
      {
        date: '2024-12-15',
        company: 'Ethereum',
        ticker: 'ETH',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 3840.00,
        exitPrice: 4773.12,
        returnPct: 24.3,
        outcome: 'Win',
        benchmarkPct: 1.8,
        tweetUrl: 'https://x.com/naval/status/4234567891'
      },
      {
        date: '2024-11-28',
        company: 'Solana',
        ticker: 'SOL',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 142.30,
        exitPrice: 187.40,
        returnPct: 31.7,
        outcome: 'Win',
        benchmarkPct: 0.8,
        tweetUrl: 'https://x.com/naval/status/4234567892'
      },
      {
        date: '2024-11-10',
        company: 'Bitcoin',
        ticker: 'BTC',
        type: 'Hold',
        direction: 'Long',
        entryPrice: 88500.00,
        exitPrice: 99468.00,
        returnPct: 12.4,
        outcome: 'Win',
        benchmarkPct: 1.3,
        tweetUrl: 'https://x.com/naval/status/4234567893'
      },
      {
        date: '2024-10-22',
        company: 'Ethereum',
        ticker: 'ETH',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 3920.00,
        exitPrice: 3759.32,
        returnPct: -4.1,
        outcome: 'Loss',
        benchmarkPct: 0.6,
        tweetUrl: 'https://x.com/naval/status/4234567894'
      },
    ]
  },
  '@arkinvest': {
    handle: '@ARKInvest',
    totalRecommendations: 203,
    accuracy: 64,
    avgReturn: '+21.3%',
    winRate: 64,
    bestTrade: { ticker: 'TSLA', return: '+76.5%', date: '2024-02-14' },
    worstTrade: { ticker: 'TDOC', return: '-52.3%', date: '2024-08-20' },
    lastUpdated: '1 day ago',
    recentTrades: [
      {
        date: '2025-01-19',
        company: 'Tesla Inc.',
        ticker: 'TSLA',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 228.40,
        exitPrice: 266.80,
        returnPct: 16.8,
        outcome: 'Win',
        benchmarkPct: 1.4,
        tweetUrl: 'https://x.com/ARKInvest/status/5234567890'
      },
      {
        date: '2025-01-14',
        company: 'Coinbase Global Inc.',
        ticker: 'COIN',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 192.50,
        exitPrice: 217.90,
        returnPct: 13.2,
        outcome: 'Win',
        benchmarkPct: 1.2,
        tweetUrl: 'https://x.com/ARKInvest/status/5234567891'
      },
      {
        date: '2025-01-08',
        company: 'Roku Inc.',
        ticker: 'ROKU',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 82.60,
        exitPrice: 77.31,
        returnPct: -6.4,
        outcome: 'Loss',
        benchmarkPct: 0.9,
        tweetUrl: 'https://x.com/ARKInvest/status/5234567892'
      },
      {
        date: '2024-12-30',
        company: 'Block Inc.',
        ticker: 'SQ',
        type: 'Buy',
        direction: 'Long',
        entryPrice: 78.90,
        exitPrice: 86.08,
        returnPct: 9.1,
        outcome: 'Win',
        benchmarkPct: 0.8,
        tweetUrl: 'https://x.com/ARKInvest/status/5234567893'
      },
      {
        date: '2024-12-20',
        company: 'Teladoc Health Inc.',
        ticker: 'TDOC',
        type: 'Hold',
        direction: 'Long',
        entryPrice: 13.20,
        exitPrice: 11.29,
        returnPct: -14.5,
        outcome: 'Loss',
        benchmarkPct: 1.1,
        tweetUrl: 'https://x.com/ARKInvest/status/5234567894'
      },
    ]
  }
};

// Default profile for unknown handles
const DEFAULT_PROFILE = {
  handle: '@unknown',
  totalRecommendations: 67,
  accuracy: 58,
  avgReturn: '+8.4%',
  winRate: 58,
  bestTrade: { ticker: 'AAPL', return: '+28.6%', date: '2024-04-12' },
  worstTrade: { ticker: 'META', return: '-18.3%', date: '2024-09-05' },
  lastUpdated: '12 hours ago',
  recentTrades: [
    {
      date: '2025-01-16',
      company: 'Apple Inc.',
      ticker: 'AAPL',
      type: 'Buy',
      direction: 'Long',
      entryPrice: 185.50,
      exitPrice: 198.86,
      returnPct: 7.2,
      outcome: 'Win',
      benchmarkPct: 0.9,
      tweetUrl: 'https://x.com/unknown/status/6234567890'
    },
    {
      date: '2025-01-09',
      company: 'Microsoft Corporation',
      ticker: 'MSFT',
      type: 'Buy',
      direction: 'Long',
      entryPrice: 415.20,
      exitPrice: 436.38,
      returnPct: 5.1,
      outcome: 'Win',
      benchmarkPct: 1.0,
      tweetUrl: 'https://x.com/unknown/status/6234567891'
    },
    {
      date: '2024-12-28',
      company: 'Alphabet Inc.',
      ticker: 'GOOGL',
      type: 'Hold',
      direction: 'Long',
      entryPrice: 142.80,
      exitPrice: 137.37,
      returnPct: -3.8,
      outcome: 'Loss',
      benchmarkPct: 0.8,
      tweetUrl: 'https://x.com/unknown/status/6234567892'
    },
    {
      date: '2024-12-15',
      company: 'Amazon.com Inc.',
      ticker: 'AMZN',
      type: 'Buy',
      direction: 'Long',
      entryPrice: 178.30,
      exitPrice: 198.62,
      returnPct: 11.4,
      outcome: 'Win',
      benchmarkPct: 1.2,
      tweetUrl: 'https://x.com/unknown/status/6234567893'
    },
    {
      date: '2024-11-30',
      company: 'Meta Platforms Inc.',
      ticker: 'META',
      type: 'Buy',
      direction: 'Long',
      entryPrice: 352.60,
      exitPrice: 320.16,
      returnPct: -9.2,
      outcome: 'Loss',
      benchmarkPct: 0.7,
      tweetUrl: 'https://x.com/unknown/status/6234567894'
    },
  ]
};

/**
 * Simulates fetching performance data for a Twitter handle
 * @param {string} handle - Twitter handle (with or without @)
 * @returns {Promise<Object>} - Performance data
 */
export const fetchMockPerformance = (handle) => {
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
};

/**
 * Validates Twitter handle format
 * @param {string} handle - Twitter handle to validate
 * @returns {boolean} - Whether handle is valid
 */
export const validateHandle = (handle) => {
  if (!handle || typeof handle !== 'string') return false;

  // Remove @ if present
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

  // Twitter handle rules: 1-15 characters, alphanumeric and underscore only
  const handleRegex = /^[a-zA-Z0-9_]{1,15}$/;
  return handleRegex.test(cleanHandle);
};
