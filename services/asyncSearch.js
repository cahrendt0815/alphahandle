/**
 * Async Search Service
 * Handles async background search jobs
 */

import { supabase } from '../utils/supabaseClient';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000';

/**
 * Start an async search job
 * @param {string} handle - Twitter handle to analyze
 * @param {string} userId - User ID
 * @param {number} timelineMonths - Number of months to fetch
 * @returns {Promise<{jobId: string, status: string}>}
 */
export async function startAsyncSearch(handle, userId, timelineMonths = 12) {
  console.log(`[AsyncSearch] Starting async search for ${handle}`);

  try {
    // Clean handle
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    // Create job directly in Supabase (bypasses backend RLS issues)
    // Frontend has authenticated session, so RLS allows the insert
    const { data: job, error } = await supabase
      .from('search_jobs')
      .insert({
        user_id: userId,
        handle: cleanHandle,
        status: 'queued',
        progress: 0,
        tweets_found: 0,
        pages_fetched: 0
      })
      .select()
      .single();

    if (error) {
      console.error('[AsyncSearch] Error creating job:', error);
      throw new Error(error.message || 'Failed to create search job');
    }

    console.log(`[AsyncSearch] Job created: ${job.id}`);

    // Notify backend to start processing
    // Backend doesn't need to create the job, just process it
    fetch(`${API_BASE}/api/search/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: job.id,
        handle: cleanHandle,
        timelineMonths,
      }),
    }).catch(err => {
      console.error('[AsyncSearch] Error notifying backend:', err);
      // Don't throw - job is created, backend will pick it up
    });

    return { jobId: job.id, status: 'queued' };
  } catch (error) {
    console.error('[AsyncSearch] Error starting search:', error);
    throw error;
  }
}

/**
 * Get the status of a search job
 * @param {string} jobId - Job ID to check
 * @returns {Promise<{status: string, progress: number, result?: any}>}
 */
export async function getSearchStatus(jobId) {
  try {
    // Query Supabase directly - user can only see their own jobs via RLS
    const { data: job, error } = await supabase
      .from('search_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('[AsyncSearch] Error fetching job status:', error);
      throw new Error(error.message || 'Failed to get search status');
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress || 0,
      tweetsFound: job.tweets_found || 0,
      result: job.status === 'completed' ? job.result : null,
      error: job.error_message
    };
  } catch (error) {
    console.error('[AsyncSearch] Error getting status:', error);
    throw error;
  }
}

/**
 * Poll for search completion
 * @param {string} jobId - Job ID to poll
 * @param {Function} onProgress - Callback for progress updates (progress, status)
 * @param {number} pollInterval - How often to poll in ms (default 2000)
 * @returns {Promise<any>} - The final result
 */
export async function pollSearchJob(jobId, onProgress, pollInterval = 2000) {
  console.log(`[AsyncSearch] Starting to poll job ${jobId}`);

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getSearchStatus(jobId);

        console.log(`[AsyncSearch] Job ${jobId} status: ${status.status} (${status.progress}%)`);

        // Call progress callback
        if (onProgress) {
          onProgress(status.progress, status.status, status.tweetsFound);
        }

        // Check if completed
        if (status.status === 'completed') {
          console.log(`[AsyncSearch] Job ${jobId} completed successfully`);
          resolve(status.result);
          return;
        }

        // Check if failed
        if (status.status === 'failed') {
          console.error(`[AsyncSearch] Job ${jobId} failed: ${status.error}`);
          reject(new Error(status.error || 'Search job failed'));
          return;
        }

        // Continue polling
        setTimeout(poll, pollInterval);
      } catch (error) {
        console.error(`[AsyncSearch] Error polling job ${jobId}:`, error);
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

/**
 * Start a search and wait for completion
 * @param {string} handle - Twitter handle to analyze
 * @param {string} userId - User ID
 * @param {number} timelineMonths - Number of months to fetch
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<any>} - The final analysis result
 */
export async function searchAndWait(handle, userId, timelineMonths = 12, onProgress) {
  // Start the job
  const { jobId } = await startAsyncSearch(handle, userId, timelineMonths);

  // Poll until complete
  const result = await pollSearchJob(jobId, onProgress);

  return result;
}
