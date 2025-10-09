/**
 * Analysis helper utilities for extracting tickers and inferring trade intent
 */

// Symbols to ignore (not equities)
const IGNORE_SYMBOLS = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', // Currencies
  'GDP', 'CPI', 'PCE', 'PPI', // Economic indicators
  'CEO', 'CFO', 'IPO', 'ETF', 'ESG', // Common abbreviations
  'Q1', 'Q2', 'Q3', 'Q4', 'YOY', 'QOQ', // Time periods
]);

// Bullish keywords for trade intent
const BULLISH_KEYWORDS = [
  'buy', 'buying', 'bought', 'long', 'accumulate', 'accumulating',
  'bullish', 'upside', 'positive', 'strong buy', 'add',
  'overweight', 'attractive', 'undervalued', 'opportunity',
];

// Bearish keywords for trade intent
const BEARISH_KEYWORDS = [
  'sell', 'selling', 'sold', 'short', 'shorting', 'bearish',
  'downside', 'negative', 'trim', 'reduce', 'exit', 'exiting',
  'underweight', 'overvalued', 'avoid', 'caution',
];

// Neutral/Hold keywords
const NEUTRAL_KEYWORDS = [
  'hold', 'holding', 'watch', 'watching', 'monitor', 'monitoring',
  'neutral', 'wait', 'waiting', 'sideways',
];

/**
 * Extract stock tickers from tweet text
 * @param {string} text - Tweet text
 * @returns {string[]} - Array of unique uppercase ticker symbols
 */
export function extractTickers(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Match $SYMBOL pattern (1-5 uppercase letters, not followed by another letter)
  const tickerRegex = /\$(?<sym>[A-Z]{1,5})(?![A-Z])/g;
  const matches = [...text.matchAll(tickerRegex)];

  // Extract symbols and filter out ignore list
  const tickers = matches
    .map(match => match.groups.sym)
    .filter(sym => !IGNORE_SYMBOLS.has(sym));

  // De-duplicate and return
  return [...new Set(tickers)];
}

/**
 * Infer trade intent from tweet text using keyword matching
 * @param {string} text - Tweet text
 * @returns {{ type: 'Buy'|'Sell'|'Hold', direction: 'Long'|'Short' }}
 */
export function inferTradeIntent(text) {
  if (!text || typeof text !== 'string') {
    return { type: 'Hold', direction: 'Long' };
  }

  const lowerText = text.toLowerCase();

  // Check for bearish/short indicators
  const hasBearish = BEARISH_KEYWORDS.some(keyword => lowerText.includes(keyword));
  const hasShort = lowerText.includes('short');

  if (hasBearish) {
    return {
      type: 'Sell',
      direction: hasShort ? 'Short' : 'Long'
    };
  }

  // Check for bullish/buy indicators
  const hasBullish = BULLISH_KEYWORDS.some(keyword => lowerText.includes(keyword));

  if (hasBullish) {
    return {
      type: 'Buy',
      direction: 'Long'
    };
  }

  // Check for neutral/hold indicators
  const hasNeutral = NEUTRAL_KEYWORDS.some(keyword => lowerText.includes(keyword));

  if (hasNeutral) {
    return {
      type: 'Hold',
      direction: 'Long'
    };
  }

  // Default: assume long position
  return { type: 'Hold', direction: 'Long' };
}

/**
 * Check if a tweet is likely spam (too many tickers)
 * @param {string[]} tickers - Array of tickers
 * @param {number} maxTickers - Maximum allowed tickers (default 10)
 * @returns {boolean}
 */
export function isSpamTweet(tickers, maxTickers = 10) {
  return tickers.length > maxTickers;
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date|string} date - Date object or ISO string
 * @returns {string}
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get next trading day (skip weekends)
 * @param {Date} date - Starting date
 * @returns {Date}
 */
export function getNextTradingDay(date) {
  const next = new Date(date);
  const dayOfWeek = next.getDay();

  // If Saturday (6), add 2 days to get to Monday
  if (dayOfWeek === 6) {
    next.setDate(next.getDate() + 2);
  }
  // If Sunday (0), add 1 day to get to Monday
  else if (dayOfWeek === 0) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Calculate percentage return
 * @param {number} entryPrice - Entry price
 * @param {number} exitPrice - Exit price
 * @returns {number} - Return as percentage
 */
export function calculateReturn(entryPrice, exitPrice) {
  if (!entryPrice || entryPrice === 0) {
    return 0;
  }
  return ((exitPrice - entryPrice) / entryPrice) * 100;
}

/**
 * Determine outcome based on return
 * @param {number} returnPct - Return percentage
 * @returns {'Win'|'Loss'}
 */
export function determineOutcome(returnPct) {
  return returnPct > 0 ? 'Win' : 'Loss';
}

/**
 * Determine Hit/Miss based on alpha
 * @param {number} alpha - Alpha vs benchmark
 * @returns {'Hit'|'Miss'}
 */
export function determineHitOrMiss(alpha) {
  return alpha > 0 ? 'Hit' : 'Miss';
}
