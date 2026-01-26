/**
 * Tweet Cache Manager
 * Tracks when tweets were last fetched to prevent expensive duplicate API calls
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../out/tweet_cache.json');

/**
 * Get cache metadata
 */
function getCacheMetadata() {
  if (!fs.existsSync(CACHE_FILE)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch (error) {
    console.warn('[Cache] Error reading cache file:', error.message);
    return {};
  }
}

/**
 * Save cache metadata
 */
function saveCacheMetadata(metadata) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(metadata, null, 2));
}

/**
 * Check if we should fetch tweets for a handle
 * Returns { shouldFetch: boolean, reason: string, lastFetch: timestamp }
 */
function shouldFetchTweets(handle) {
  const metadata = getCacheMetadata();
  const handleData = metadata[handle.toLowerCase()];

  if (!handleData) {
    return {
      shouldFetch: true,
      reason: 'No cache exists for this handle',
      lastFetch: null
    };
  }

  const lastFetch = new Date(handleData.lastFetchDate);
  const now = new Date();
  const hoursSinceLastFetch = (now - lastFetch) / (1000 * 60 * 60);

  // Don't fetch if last fetch was within 24 hours (same day or recent)
  if (hoursSinceLastFetch < 24) {
    return {
      shouldFetch: false,
      reason: `Last fetched ${Math.round(hoursSinceLastFetch)} hours ago (within 24h limit)`,
      lastFetch: lastFetch.toISOString(),
      tweetCount: handleData.tweetCount
    };
  }

  return {
    shouldFetch: true,
    reason: `Last fetch was ${Math.round(hoursSinceLastFetch)} hours ago (>24h)`,
    lastFetch: lastFetch.toISOString()
  };
}

/**
 * Update cache metadata after fetching tweets
 */
function updateCache(handle, tweetCount, lastTweetDate = null) {
  const metadata = getCacheMetadata();

  metadata[handle.toLowerCase()] = {
    handle: handle,
    lastFetchDate: new Date().toISOString(),
    tweetCount: tweetCount,
    lastTweetDate: lastTweetDate, // Most recent tweet date
  };

  saveCacheMetadata(metadata);
  console.log(`[Cache] Updated cache for @${handle}: ${tweetCount} tweets`);
}

/**
 * Get the last tweet date for a handle (to fetch only newer tweets)
 */
function getLastTweetDate(handle) {
  const metadata = getCacheMetadata();
  const handleData = metadata[handle.toLowerCase()];

  return handleData?.lastTweetDate || null;
}

/**
 * Clear cache for a specific handle
 */
function clearCache(handle) {
  const metadata = getCacheMetadata();
  delete metadata[handle.toLowerCase()];
  saveCacheMetadata(metadata);
  console.log(`[Cache] Cleared cache for @${handle}`);
}

/**
 * Clear all cache
 */
function clearAllCache() {
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
    console.log('[Cache] Cleared all cache');
  }
}

module.exports = {
  shouldFetchTweets,
  updateCache,
  getLastTweetDate,
  clearCache,
  clearAllCache,
  getCacheMetadata,
};
