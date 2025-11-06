/**
 * Analysis Cache Service
 * Handles pre-fetching and caching of analysis results
 */

const ANALYSIS_SERVER_URL = process.env.ANALYSIS_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

// In-memory cache for pre-fetched analysis
const analysisCache = new Map();

/**
 * Start pre-fetching analysis in the background
 * @param {string} handle - Twitter handle to analyze
 * @returns {Promise<void>}
 */
export async function prefetchAnalysis(handle) {
  const cleanHandle = handle.replace(/^@/, '').toLowerCase();

  console.log('[AnalysisCache] Starting pre-fetch for handle:', cleanHandle);

  try {
    // Start the analysis request in the background
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout

    const analysisPromise = fetch(`${ANALYSIS_SERVER_URL}/api/analyze?handle=${encodeURIComponent(cleanHandle)}&months=36`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[AnalysisCache] Pre-fetch completed for:', cleanHandle);

        // Store in cache with timestamp
        analysisCache.set(cleanHandle, {
          data,
          timestamp: Date.now(),
        });

        return data;
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('[AnalysisCache] Pre-fetch error for', cleanHandle, ':', error);
        // Don't throw - just log the error and let Portal handle the fresh fetch
      });

    // Store the promise itself so Portal can await it if needed
    analysisCache.set(cleanHandle, {
      promise: analysisPromise,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('[AnalysisCache] Pre-fetch setup error:', error);
  }
}

/**
 * Get cached analysis or wait for pre-fetch to complete
 * @param {string} handle - Twitter handle
 * @returns {Promise<object|null>} - Cached data or null
 */
export async function getCachedAnalysis(handle) {
  const cleanHandle = handle.replace(/^@/, '').toLowerCase();
  const cached = analysisCache.get(cleanHandle);

  if (!cached) {
    console.log('[AnalysisCache] No cache found for:', cleanHandle);
    return null;
  }

  // If we have the promise, wait for it
  if (cached.promise) {
    console.log('[AnalysisCache] Waiting for pre-fetch to complete:', cleanHandle);
    const data = await cached.promise;
    return data || null;
  }

  // If we have the data, check if it's still fresh (5 minutes)
  const age = Date.now() - cached.timestamp;
  if (age < 5 * 60 * 1000 && cached.data) {
    console.log('[AnalysisCache] Returning cached data for:', cleanHandle, '(age:', Math.round(age / 1000), 's)');
    return cached.data;
  }

  console.log('[AnalysisCache] Cache expired for:', cleanHandle);
  return null;
}

/**
 * Clear cache for a specific handle
 * @param {string} handle - Twitter handle
 */
export function clearCache(handle) {
  const cleanHandle = handle.replace(/^@/, '').toLowerCase();
  analysisCache.delete(cleanHandle);
  console.log('[AnalysisCache] Cleared cache for:', cleanHandle);
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  analysisCache.clear();
  console.log('[AnalysisCache] Cleared all cache');
}
