/**
 * Real data provider for Fintwit Performance
 * Fetches data from serverless API endpoint
 * @module services/providers/realProvider
 */

/** @typedef {import('../../types/analysis').AnalysisResult} AnalysisResult */

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Fetches real performance data from serverless API
 * @param {string} handle - Twitter handle (with or without @)
 * @param {object} options - Optional parameters
 * @param {number} options.limit - Max tweets to analyze
 * @param {string} options.since - ISO date string for oldest tweet
 * @returns {Promise<AnalysisResult>} - Performance analysis result
 */
export async function fetchRealAnalysis(handle, options = {}) {
  // Normalize handle (add @ if not present)
  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;

  // Build query params
  const params = new URLSearchParams({
    handle: normalizedHandle,
    limit: String(options.limit || 100)
  });

  if (options.since) {
    params.append('since', options.since);
  }

  const url = `${API_BASE}/api/analyze?${params.toString()}`;

  console.log(`[realProvider] Fetching analysis for ${normalizedHandle}`);
  console.log(`[realProvider] URL: ${url}`);

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // If API returns 503 with requiresSetup flag, this means Twitter API is not configured
      if (response.status === 503 && errorData.requiresSetup) {
        const error = new Error('Twitter API not configured');
        error.code = 'API_NOT_CONFIGURED';
        error.details = errorData;
        throw error;
      }

      throw new Error(
        errorData.message || `API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from API');
    }

    // Ensure all required fields are present
    const result = {
      handle: data.handle || normalizedHandle,
      avgReturn: data.avgReturn || 0,
      alpha: data.alpha || 0,
      hitRatio: data.hitRatio || 0,
      winRate: data.winRate || 0,
      bestTrade: data.bestTrade || { ticker: 'N/A', return: '0%', date: '' },
      worstTrade: data.worstTrade || { ticker: 'N/A', return: '0%', date: '' },
      lastUpdated: data.lastUpdated || 'Just now',
      recentTrades: data.recentTrades || [],
      dataSource: 'real'
    };

    console.log(`[realProvider] Analysis complete: ${result.recentTrades.length} trades`);

    return result;
  } catch (error) {
    console.error('[realProvider] Error:', error);

    // Re-throw with more context
    if (error.code === 'API_NOT_CONFIGURED') {
      throw error; // Pass through configuration errors
    }

    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${API_TIMEOUT}ms`);
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }

    if (error.message && error.message.includes('fetch')) {
      const networkError = new Error('Network error - unable to reach API');
      networkError.code = 'NETWORK_ERROR';
      networkError.cause = error;
      throw networkError;
    }

    throw error;
  }
}

/**
 * Check if real provider is properly configured
 * @returns {Promise<boolean>}
 */
export async function isConfigured() {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/api/analyze?handle=@test`,
      {},
      5000 // Short timeout for health check
    );

    // 503 with requiresSetup = not configured
    // Any other response = configured (even errors mean the API is reachable)
    if (response.status === 503) {
      const data = await response.json().catch(() => ({}));
      return !data.requiresSetup;
    }

    return true;
  } catch (error) {
    console.warn('[realProvider] Configuration check failed:', error.message);
    return false;
  }
}
