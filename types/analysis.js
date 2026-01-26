/**
 * @typedef {Object} RecommendationRow
 * @property {string} ticker - Stock ticker symbol (e.g., "$TSLA")
 * @property {string} company - Full company name (e.g., "Tesla Inc.")
 * @property {string} dateMentioned - Date mentioned in YYYY-MM-DD format
 * @property {number} beginningValue - Closing price on date mentioned
 * @property {number} lastValue - Current stock price
 * @property {number} dividends - Total dividends received
 * @property {number} adjLastValue - Last value + Dividends
 * @property {number} stockReturn - (Adj. last value / Beginning value) - 1, as percentage
 * @property {number} alphaVsSPY - Stock return - SPY return, as percentage
 * @property {'Hit' | 'Miss'} hitOrMiss - Hit if Alpha > 0, else Miss
 * @property {string} tweetUrl - URL to source tweet
 * @property {'Buy'|'Sell'|'Hold'} [type] - Trade type (optional, for real provider)
 * @property {'Long'|'Short'} [direction] - Trade direction (optional, for real provider)
 */

/**
 * @typedef {Object} BestWorstTrade
 * @property {string} ticker - Stock ticker symbol
 * @property {string} return - Return percentage as string (e.g., "+54.2%")
 * @property {string} date - Trade date in YYYY-MM-DD format
 * @property {string} [company] - Company name (optional)
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {string} handle - Twitter handle (with @)
 * @property {number} avgReturn - Average return: (Sum of stock returns) / (number of stocks), as percentage
 * @property {number} alpha - Average alpha: (Sum of Alpha vs. SPY) / (number of stocks), as percentage
 * @property {number} hitRatio - Hit ratio: (number of HIT results) / (number of stocks), as percentage
 * @property {number} winRate - Win rate: (number of WINS / total number of calls), as percentage
 * @property {BestWorstTrade} bestTrade - Best performing trade
 * @property {BestWorstTrade} worstTrade - Worst performing trade
 * @property {string} lastUpdated - Last update time (e.g., "3 hours ago")
 * @property {RecommendationRow[]} recentTrades - Array of recent recommendations
 * @property {'mock'|'real'|'mock-fallback'} [dataSource] - Data source indicator (optional)
 */

// Export types for JSDoc usage
export const Types = {};
