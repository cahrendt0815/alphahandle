/**
 * Handle Search Service
 *
 * 2-stage fetch strategy with 24h caching:
 * 1. Check cache first (24h expiry)
 * 2. If no cache or expired:
 *    a. Query tweets with cashtags (cheap & narrow)
 *    b. Pull small recent window (last 30 tweets) to catch name-only or bare tickers
 * 3. Run local prefilter on both sets, merge, dedupe, cache, return
 */

import type { Tweet } from '../types/twitter';
import * as twitter from '../api/twitterClient';
import { loadCompanies, containsStockSignal } from '../api/prefilter';

// In-memory cache for tweet results (24h expiry)
const tweetCache = new Map<string, { tweets: Tweet[]; timestamp: number; scanned: number }>();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface FilteredResult {
  kept: Tweet[];
  scanned: number;
}

export interface SearchOptions {
  sinceId?: string;
  maxCount?: number;
  timelineMonths?: number; // How many months back to fetch (based on user plan)
}

/**
 * Get filtered tweets for a handle using 2-stage fetch + local prefilter
 *
 * @param handle - Twitter handle (with or without @)
 * @param options - Optional sinceId and maxCount
 * @returns Object with kept tweets and scanned count
 */
export async function getFilteredTweetsForHandle(
  handle: string,
  options?: SearchOptions
): Promise<FilteredResult> {
  const cleanHandle = handle.replace('@', '').toLowerCase();
  console.log(`[HandleSearch] Fetching tweets for @${cleanHandle}`);

  // Check cache first
  const cached = tweetCache.get(cleanHandle);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    const hoursAgo = Math.round(age / (1000 * 60 * 60));

    if (age < CACHE_DURATION_MS) {
      console.log(`[HandleSearch] ✅ Using cached tweets (${hoursAgo}h old, ${cached.tweets.length} tweets)`);
      const final = options?.maxCount ? cached.tweets.slice(0, options.maxCount) : cached.tweets;
      return { kept: final, scanned: cached.scanned };
    } else {
      console.log(`[HandleSearch] Cache expired (${hoursAgo}h old), fetching fresh data`);
      tweetCache.delete(cleanHandle);
    }
  }

  // Calculate date range based on timeline months (default: 12 months for Ape plan)
  const timelineMonths = options?.timelineMonths || 12;
  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - timelineMonths);
  const sinceDateStr = sinceDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  console.log(`[HandleSearch] Fetching tweets from last ${timelineMonths} months (since ${sinceDateStr})`);

  // Load company data for prefiltering
  const companies = loadCompanies();
  console.log(`[HandleSearch] Loaded ${companies.length} companies for filtering`);

  // Stage A: Query tweets with cashtags within date range
  console.log('[HandleSearch] Stage A: Fetching tweets with cashtags...');
  const cashtagQuery = `has:cashtags -is:retweet -is:reply since:${sinceDateStr}`;
  const withCashtags = await twitter.searchFrom(
    handle,
    cashtagQuery,
    3200 // Twitter API max per request
  );

  // Stage B: Query all tweets within date range for name-only mentions
  console.log('[HandleSearch] Stage B: Fetching all tweets in timeline...');
  const recentQuery = `-is:retweet -is:reply since:${sinceDateStr}`;
  const recentSmall = await twitter.searchFrom(handle, recentQuery, 3200);

  // Merge and dedupe by tweet ID
  const merged = deduplicateById([...withCashtags, ...recentSmall]);
  console.log(`[HandleSearch] Merged ${merged.length} unique tweets (from ${withCashtags.length} + ${recentSmall.length})`);

  // Run prefilter on all merged tweets
  console.log('[HandleSearch] Running local prefilter...');
  const kept: Tweet[] = [];

  for (const tweet of merged) {
    const hasSignal = await containsStockSignal(tweet.text ?? '', companies);
    if (hasSignal) {
      kept.push(tweet);
    }
  }

  console.log(`[HandleSearch] Kept ${kept.length} tweets after prefiltering`);

  // Sort by newest first (if created_at is available)
  kept.sort((a, b) => {
    if (!a.created_at || !b.created_at) return 0;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Cache the results for 24 hours
  tweetCache.set(cleanHandle, {
    tweets: kept,
    timestamp: Date.now(),
    scanned: merged.length
  });
  console.log(`[HandleSearch] 💾 Cached ${kept.length} tweets for @${cleanHandle}`);

  // Apply maxCount if specified
  const final = options?.maxCount ? kept.slice(0, options.maxCount) : kept;

  return {
    kept: final,
    scanned: merged.length
  };
}

/**
 * Deduplicate tweets by ID
 */
function deduplicateById(tweets: Tweet[]): Tweet[] {
  const seen = new Set<string>();
  const unique: Tweet[] = [];

  for (const tweet of tweets) {
    if (!seen.has(tweet.id)) {
      seen.add(tweet.id);
      unique.push(tweet);
    }
  }

  return unique;
}