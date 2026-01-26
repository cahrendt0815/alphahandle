/**
 * Twitter Scraper using TwitterAPI.io
 * Fetches real tweets from Twitter handles
 */

const axios = require('axios');
const fs = require('fs');

/**
 * Fetches all tweets matching the given query from Twitter API
 * @param {string} query - The search query for tweets
 * @param {string} apiKey - Twitter API key for authentication
 * @returns {Promise<Array>} List of unique tweets matching the query
 */
async function fetchAllTweets(query, apiKey) {
  const baseUrl = 'https://api.twitterapi.io/twitter/tweet/advanced_search';
  const headers = { 'x-api-key': apiKey };
  const allTweets = [];
  const seenTweetIds = new Set();
  let cursor = null;
  let lastMinId = null;
  const maxRetries = 3;

  console.log(`[Twitter] Fetching tweets for query: ${query}`);

  while (true) {
    // Prepare query parameters
    const params = {
      query: query,
      queryType: 'Latest',
    };

    // Add cursor if available (for regular pagination)
    if (cursor) {
      params.cursor = cursor;
    } else if (lastMinId) {
      // Add max_id if available (for fetching beyond initial limit)
      params.query = query + ' max_id:' + lastMinId;
    }

    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        // Make API request
        const response = await axios.get(baseUrl, {
          headers,
          params,
          timeout: 30000,
        });

        const data = response.data;

        // Extract tweets and metadata
        const tweets = data.tweets || [];
        const hasNextPage = data.has_next_page || false;
        cursor = data.next_cursor || null;

        // Filter out duplicate tweets
        const newTweets = tweets.filter((tweet) => !seenTweetIds.has(tweet.id));

        // Add new tweet IDs to the set and tweets to the collection
        newTweets.forEach((tweet) => {
          seenTweetIds.add(tweet.id);
          allTweets.push(tweet);
        });

        console.log(`[Twitter] Fetched ${newTweets.length} new tweets (${allTweets.length} total)`);

        // If no new tweets and no next page, break the loop
        if (newTweets.length === 0 && !hasNextPage) {
          return allTweets;
        }

        // Update lastMinId from the last tweet if available
        if (newTweets.length > 0) {
          lastMinId = newTweets[newTweets.length - 1].id;
        }

        // If no next page but we have new tweets, try with max_id
        if (!hasNextPage && newTweets.length > 0) {
          cursor = null; // Reset cursor for max_id pagination
          break;
        }

        // If has next page, continue with cursor
        if (hasNextPage) {
          break;
        }
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          console.error(`[Twitter] Failed to fetch tweets after ${maxRetries} attempts:`, error.message);
          return allTweets;
        }

        // Handle rate limiting
        if (error.response && error.response.status === 429) {
          console.log('[Twitter] Rate limit reached. Waiting for 5 seconds...');
          await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
        } else {
          console.log(`[Twitter] Error occurred: ${error.message}. Retrying ${retryCount}/${maxRetries}`);
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    }

    // If no more pages and no new tweets with max_id, we're done
    if (!cursor && lastMinId) {
      break;
    }
  }

  return allTweets;
}

/**
 * Fetch tweets from a specific Twitter handle
 * @param {string} handle - Twitter handle (with or without @)
 * @param {string} apiKey - Twitter API key
 * @param {Object} options - Additional options (startDate, endDate, limit, excludeReplies)
 * @returns {Promise<Array>} List of tweets from the handle
 */
async function fetchTweetsFromHandle(handle, apiKey, options = {}) {
  // Remove @ if present
  const cleanHandle = handle.replace('@', '');

  // Build query
  let query = `from:${cleanHandle}`;

  // Exclude replies if requested (to get only original tweets)
  if (options.excludeReplies) {
    query += ` -filter:replies`;
  }

  // Add date filters if provided
  if (options.startDate) {
    query += ` since:${options.startDate}`;
  }
  if (options.endDate) {
    query += ` until:${options.endDate}`;
  }

  console.log(`[Twitter] Scraping tweets from @${cleanHandle}`);
  const tweets = await fetchAllTweets(query, apiKey);

  // Apply limit if specified
  if (options.limit && tweets.length > options.limit) {
    return tweets.slice(0, options.limit);
  }

  return tweets;
}

/**
 * Extract raw tweets and save to file
 * @param {string} handle - Twitter handle
 * @param {string} apiKey - Twitter API key
 * @param {string} outputPath - Path to save the tweets
 * @param {Object} options - Additional options
 */
async function scrapeTweetsToFile(handle, apiKey, outputPath, options = {}) {
  try {
    const tweets = await fetchTweetsFromHandle(handle, apiKey, options);

    console.log(`[Twitter] Scraped ${tweets.length} tweets from @${handle.replace('@', '')}`);

    // Save to file
    fs.writeFileSync(outputPath, JSON.stringify(tweets, null, 2));
    console.log(`[Twitter] Tweets saved to ${outputPath}`);

    return tweets;
  } catch (error) {
    console.error('[Twitter] Error scraping tweets:', error.message);
    throw error;
  }
}

module.exports = {
  fetchAllTweets,
  fetchTweetsFromHandle,
  scrapeTweetsToFile,
};