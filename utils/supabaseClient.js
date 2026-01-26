/**
 * Supabase client configuration and database operations
 * @module utils/supabaseClient
 */

import { createClient } from '@supabase/supabase-js';

/** @typedef {import('../types/analysis').AnalysisResult} AnalysisResult */

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vjapeusemdciohsvnelx.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqYXBldXNlbWRjaW9oc3ZuZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDI4OTgsImV4cCI6MjA3NDkxODg5OH0.3p1cgqkSarLjj5Isb4fJ5lylMeVE618JUqG6hXdESgU';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Normalize handle - remove @ and convert to lowercase
 * @param {string} handle - Twitter handle (with or without @)
 * @returns {string} - Normalized handle
 */
function normalizeHandle(handle) {
  if (!handle) return '';
  return handle.replace(/^@/, '').toLowerCase();
}

/**
 * Save or update analysis result to Supabase
 * @param {AnalysisResult} analysis - Analysis result to save
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveAnalysis(analysis) {
  try {
    const normalizedHandle = normalizeHandle(analysis.handle);

    console.log(`[Supabase] Saving analysis for @${normalizedHandle}`);

    // Prepare data for database - map to exact column names
    const row = {
      handle: normalizedHandle,
      accuracy: analysis.hitRatio || analysis.accuracy || 0,
      avg_return: analysis.avgReturn || 0,
      alpha: analysis.alpha || 0,
      total_calls: analysis.recentTrades?.length || analysis.totalRecommendations || analysis.totalCalls || 0,
      win_rate: analysis.winRate || 0,
      best_trade: analysis.bestTrade || null,
      worst_trade: analysis.worstTrade || null,
      recent_recommendations: analysis.recentTrades || analysis.recentRecommendations || [],
      last_updated: new Date().toISOString(), // ✅ Real ISO timestamp
      last_analysis_date: analysis.lastAnalysisDate || new Date().toISOString(), // Track when analysis was run
    };

    // Use upsert to insert or update based on handle
    const { error: upsertError } = await supabase
      .from('analyses')
      .upsert(row, { onConflict: 'handle' });

    if (upsertError) {
      console.error('[Supabase] Error:', upsertError.message, upsertError.details);
      return { success: false, error: upsertError.message };
    }

    console.log('[Supabase] Successfully saved analysis');
    return { success: true };
  } catch (error) {
    console.error('[Supabase] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch existing analysis for a handle from Supabase
 * @param {string} handle - Twitter handle (with or without @)
 * @returns {Promise<AnalysisResult|null>}
 */
export async function fetchAnalysis(handle) {
  try {
    const normalizedHandle = normalizeHandle(handle);

    console.log(`[Supabase] Fetching analysis for ${normalizedHandle}`);

    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('handle', normalizedHandle)
      .maybeSingle(); // ✅ Returns null if no row, doesn't throw error

    if (error) {
      console.error('[Supabase] Error:', error.message, error.details);
      return null;
    }

    if (!data) {
      console.log('[Supabase] No existing analysis');
      return null;
    }

    console.log(`[Supabase] Cache hit for ${normalizedHandle}`);

    // Transform database format back to AnalysisResult format
    const analysisResult = {
      handle: `@${data.handle}`,
      avgReturn: data.avg_return || 0,
      alpha: data.alpha || 0,
      hitRatio: data.accuracy || 0,
      winRate: data.win_rate || 0,
      bestTrade: data.best_trade || { ticker: 'N/A', return: '0%', date: '' },
      worstTrade: data.worst_trade || { ticker: 'N/A', return: '0%', date: '' },
      lastUpdated: data.last_updated ? new Date(data.last_updated).toLocaleString() : 'Unknown',
      lastAnalysisDate: data.last_analysis_date || null,
      recentTrades: data.recent_recommendations || [],
      dataSource: 'cached',
    };

    return analysisResult;
  } catch (error) {
    console.error('[Supabase] Error:', error.message);
    return null;
  }
}

/**
 * Get all analyses from database
 * @param {number} limit - Maximum number of results
 * @returns {Promise<AnalysisResult[]>}
 */
export async function getAllAnalyses(limit = 50) {
  try {
    console.log('[Supabase] Fetching all analyses');

    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Supabase] Error:', error.message, error.details);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('[Supabase] No analyses found');
      return [];
    }

    console.log(`[Supabase] Found ${data.length} analyses`);

    // Transform to AnalysisResult format
    return data.map(row => ({
      handle: `@${row.handle}`,
      avgReturn: row.avg_return || 0,
      alpha: row.alpha || 0,
      hitRatio: row.accuracy || 0,
      winRate: row.win_rate || 0,
      bestTrade: row.best_trade || { ticker: 'N/A', return: '0%', date: '' },
      worstTrade: row.worst_trade || { ticker: 'N/A', return: '0%', date: '' },
      lastUpdated: row.last_updated ? new Date(row.last_updated).toLocaleString() : 'Unknown',
      recentTrades: row.recent_recommendations || [],
      dataSource: 'cached',
    }));
  } catch (error) {
    console.error('[Supabase] Error:', error.message);
    return [];
  }
}

/**
 * Delete an analysis from database
 * @param {string} handle - Twitter handle
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteAnalysis(handle) {
  try {
    const normalizedHandle = normalizeHandle(handle);

    console.log(`[Supabase] Deleting analysis for ${normalizedHandle}`);

    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('handle', normalizedHandle);

    if (error) {
      console.error('[Supabase] Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    console.log('[Supabase] Successfully deleted analysis');
    return { success: true };
  } catch (error) {
    console.error('[Supabase] Error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check if Supabase connection is working
 * @returns {Promise<boolean>}
 */
export async function checkConnection() {
  try {
    const { error } = await supabase
      .from('analyses')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('[Supabase] Connection check failed:', error.message);
      return false;
    }

    console.log('[Supabase] Connection successful');
    return true;
  } catch (error) {
    console.error('[Supabase] Error:', error.message);
    return false;
  }
}
