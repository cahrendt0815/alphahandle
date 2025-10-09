/**
 * Fintwit Performance Service
 * Main service layer that abstracts data providers
 * @module services/fintwitService
 */

import { fetchMockAnalysis } from './providers/mockProvider';
import { fetchRealAnalysis } from './providers/realProvider';
import { saveAnalysis, fetchAnalysis } from '../utils/supabaseClient';

/** @typedef {import('../types/analysis').AnalysisResult} AnalysisResult */

/**
 * Analyzes a Twitter handle's stock performance
 * Automatically chooses between mock and real data providers
 * based on EXPO_PUBLIC_USE_MOCK environment variable
 * Saves results to Supabase after analysis
 *
 * @param {string} handle - Twitter handle (with or without @)
 * @param {object} options - Optional analysis parameters
 * @param {number} options.limit - Max tweets to analyze
 * @param {string} options.since - ISO date string for oldest tweet
 * @returns {Promise<AnalysisResult>} - Performance analysis result
 */
export async function analyzeHandle(handle, options = {}) {
  console.log(`[fintwitService] Analyzing handle: ${handle}`);

  try {
    // FIRST: Check if we have cached data in Supabase (from simulation or previous analysis)
    const cachedResult = await getCachedAnalysis(handle);
    if (cachedResult) {
      console.log('[fintwitService] Using cached analysis from Supabase');
      return { ...cachedResult, dataSource: 'supabase-cache' };
    }

    // SECOND: Check if we should use mock data (default to true)
    const useMock = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';
    console.log(`[fintwitService] No cached data, using ${useMock ? 'MOCK' : 'REAL'} data provider`);

    let result;

    if (useMock) {
      // Use mock provider
      result = await fetchMockAnalysis(handle);
      result = { ...result, dataSource: 'mock' };
    } else {
      // Use real provider (via serverless proxy)
      try {
        result = await fetchRealAnalysis(handle, options);
      } catch (error) {
        // Graceful fallback to mock data if real provider fails
        console.warn('[fintwitService] Real provider failed, falling back to mock data');
        console.warn('[fintwitService] Error details:', error.message);

        const fallbackResult = await fetchMockAnalysis(handle);
        result = { ...fallbackResult, dataSource: 'mock-fallback' };
      }
    }

    // Save result to Supabase (non-blocking)
    saveAnalysis(result).then(({ success, error }) => {
      if (success) {
        console.log('[fintwitService] Successfully saved analysis to Supabase');
      } else {
        console.warn('[fintwitService] Failed to save analysis to Supabase:', error);
      }
    }).catch(err => {
      console.warn('[fintwitService] Exception saving to Supabase:', err);
    });

    return result;
  } catch (error) {
    console.error('[fintwitService] Error analyzing handle:', error);
    throw error;
  }
}

/**
 * Get cached analysis from Supabase if available
 * @param {string} handle - Twitter handle
 * @returns {Promise<AnalysisResult|null>}
 */
export async function getCachedAnalysis(handle) {
  try {
    console.log(`[fintwitService] Fetching cached analysis for: ${handle}`);
    const cachedResult = await fetchAnalysis(handle);

    if (cachedResult) {
      console.log('[fintwitService] Found cached analysis');
      return cachedResult;
    }

    console.log('[fintwitService] No cached analysis found');
    return null;
  } catch (error) {
    console.error('[fintwitService] Error fetching cached analysis:', error);
    return null;
  }
}

/**
 * Validates Twitter handle format
 * @param {string} handle - Twitter handle to validate
 * @returns {boolean} - Whether handle is valid
 */
export function validateHandle(handle) {
  if (!handle || typeof handle !== 'string') return false;

  // Remove @ if present
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

  // Twitter handle rules: 1-15 characters, alphanumeric and underscore only
  const handleRegex = /^[a-zA-Z0-9_]{1,15}$/;
  return handleRegex.test(cleanHandle);
}
