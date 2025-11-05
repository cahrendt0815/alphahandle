/**
 * Twitter API Client
 *
 * Tiny wrapper around Twitter provider (twitterapi.io or compatible).
 * Uses local proxy server to avoid CORS issues in the browser.
 * Provides two methods:
 * - searchFrom: Query tweets from a specific handle with custom filters
 * - userRecent: Get recent timeline for a handle (no replies/retweets)
 */

import type { Tweet } from '../types/twitter';

// Use local proxy server to avoid CORS
const PROXY_BASE_URL = 'http://localhost:8001';

/**
 * Search tweets from a specific handle with custom query filters
 *
 * @param handle - Twitter handle (with or without @)
 * @param queryTail - Additional query parameters (e.g., "has:cashtags -is:retweet")
 * @param max - Maximum number of tweets to fetch
 * @returns Array of normalized Tweet objects
 */
export async function searchFrom(
  handle: string,
  queryTail: string,
  max: number
): Promise<Tweet[]> {
  const cleanHandle = handle.replace('@', '');
  const query = `from:${cleanHandle} ${queryTail}`;

  console.log(`[TwitterClient] Searching: "${query}" (max: ${max})`);

  try {
    const params = new URLSearchParams({
      query: query,
      queryType: 'Latest'
    });

    const url = `${PROXY_BASE_URL}/api/tweets/search?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`[TwitterClient] Rate limit hit for searchFrom`);
        return [];
      }
      throw new Error(`Proxy API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const tweets = normalizeTweets(data);
    const limited = tweets.slice(0, max);

    console.log(`[TwitterClient] Found ${limited.length} tweets with query`);
    return limited;

  } catch (error) {
    console.error(`[TwitterClient] Error in searchFrom:`, error);
    throw error;
  }
}

/**
 * Get recent timeline for a handle (no replies/retweets)
 *
 * @param handle - Twitter handle (with or without @)
 * @param max - Maximum number of tweets to fetch
 * @returns Array of normalized Tweet objects
 */
export async function userRecent(
  handle: string,
  max: number
): Promise<Tweet[]> {
  const cleanHandle = handle.replace('@', '');
  const query = `from:${cleanHandle} -is:retweet -is:reply`;

  console.log(`[TwitterClient] Fetching recent ${max} tweets for @${cleanHandle}`);

  try {
    const params = new URLSearchParams({
      query: query,
      queryType: 'Latest'
    });

    const url = `${PROXY_BASE_URL}/api/tweets/search?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`[TwitterClient] Rate limit hit for userRecent`);
        return [];
      }
      if (response.status === 404) {
        console.warn(`[TwitterClient] User @${cleanHandle} not found`);
        return [];
      }
      throw new Error(`Proxy API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const tweets = normalizeTweets(data);
    const limited = tweets.slice(0, max);

    console.log(`[TwitterClient] Found ${limited.length} recent tweets`);
    return limited;

  } catch (error) {
    console.error(`[TwitterClient] Error in userRecent:`, error);
    throw error;
  }
}

/**
 * Normalize API response to Tweet[] format
 * Handles different Twitter API response structures
 */
function normalizeTweets(data: any): Tweet[] {
  if (!data) return [];

  // twitterapi.io format: { tweets: [...] }
  const rawTweets = data.tweets || data.data || [];

  if (!Array.isArray(rawTweets)) {
    console.warn('[TwitterClient] Unexpected response format:', data);
    return [];
  }

  return rawTweets
    .filter((t: any) => t && (t.id || t.tweet_id) && t.text)
    .map((t: any) => ({
      id: String(t.id || t.tweet_id),
      text: t.text || '',
      created_at: t.created_at || t.created_on
    }));
}
