/**
 * Smart tweet fetching for free tier users
 * Only fetches until last ticker mention (max 50 tweets)
 */

const TICKER_REGEX = /\$([A-Z]{1,5})\b/g;

/**
 * Check if tweet contains a ticker
 */
function hasTicker(tweetText) {
  return TICKER_REGEX.test(tweetText);
}

/**
 * Smart fetch for free tier: stop at last ticker mention or 50 tweets max
 * @param {Array} allTweets - All fetched tweets
 * @param {boolean} isPaidUser - Whether user has paid plan
 * @returns {Object} { tweets, hasMoreTickers, stoppedEarly }
 */
function smartFilterTweets(allTweets, isPaidUser = false) {
  // Paid users get all tweets
  if (isPaidUser) {
    return {
      tweets: allTweets,
      hasMoreTickers: false,
      stoppedEarly: false,
      totalFetched: allTweets.length
    };
  }

  // Free tier: max 50 tweets, stop at last ticker
  const maxTweets = 50;
  let lastTickerIndex = -1;

  // Find the last tweet with a ticker within first 50 tweets
  for (let i = 0; i < Math.min(allTweets.length, maxTweets); i++) {
    if (hasTicker(allTweets[i].text)) {
      lastTickerIndex = i;
    }
  }

  // If we found a ticker, include tweets up to and including that tweet
  if (lastTickerIndex >= 0) {
    const tweets = allTweets.slice(0, lastTickerIndex + 1);
    const hasMoreTickers = allTweets.length > lastTickerIndex + 1;

    return {
      tweets: tweets,
      hasMoreTickers: hasMoreTickers,
      stoppedEarly: true,
      totalFetched: allTweets.length,
      lastTickerAt: lastTickerIndex
    };
  }

  // No tickers found in first 50 tweets - return first 50 but flag as no tickers
  const tweets = allTweets.slice(0, maxTweets);

  return {
    tweets: tweets,
    hasMoreTickers: false,
    stoppedEarly: true,
    noTickersFound: true,
    totalFetched: allTweets.length
  };
}

module.exports = {
  smartFilterTweets,
  hasTicker
};
