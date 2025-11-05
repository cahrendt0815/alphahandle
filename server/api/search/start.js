/**
 * POST /api/search/start
 * Start an async tweet search job
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[SearchStart] Missing Supabase configuration');
  console.error('[SearchStart] SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
  console.error('[SearchStart] SUPABASE_KEY:', supabaseKey ? 'present' : 'missing');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { handle, userId, timelineMonths = 12 } = req.body;

    // Validate input
    if (!handle) {
      return res.status(400).json({ error: 'Missing required field: handle' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Clean handle
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    console.log(`[SearchStart] Creating job for @${cleanHandle} (user: ${userId})`);

    // Create job in database
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
      console.error('[SearchStart] Error creating job:', error);
      return res.status(500).json({ error: 'Failed to create search job', details: error.message });
    }

    console.log(`[SearchStart] Job created: ${job.id}`);

    // Trigger background worker (in a real implementation, this would use a queue)
    // For now, we'll start it immediately in the background
    processSearchJob(job.id, cleanHandle, timelineMonths).catch(err => {
      console.error(`[SearchWorker] Error processing job ${job.id}:`, err);
    });

    // Return job ID immediately
    return res.status(202).json({
      jobId: job.id,
      status: 'queued',
      message: 'Search job created successfully'
    });

  } catch (error) {
    console.error('[SearchStart] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * Background worker function to process the search job
 * In production, this would be in a separate worker process/service
 */
async function processSearchJob(jobId, handle, timelineMonths) {
  console.log(`[SearchWorker] Starting job ${jobId} for @${handle}`);

  try {
    // Update status to processing
    await supabase
      .from('search_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        progress: 10
      })
      .eq('id', jobId);

    // Import the existing analysis function
    const { analyzeHandle } = require('../../../services/fintwitService');

    console.log(`[SearchWorker] Analyzing @${handle}...`);

    // Progress update: 30%
    await supabase
      .from('search_jobs')
      .update({ progress: 30 })
      .eq('id', jobId);

    // Run the analysis
    const result = await analyzeHandle(`@${handle}`, { timelineMonths });

    console.log(`[SearchWorker] Analysis complete for @${handle}: ${result.recentTrades?.length || 0} trades`);

    // Progress update: 90%
    await supabase
      .from('search_jobs')
      .update({ progress: 90 })
      .eq('id', jobId);

    // Update job with results
    await supabase
      .from('search_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result: result,
        tweets_found: result.recentTrades?.length || 0,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[SearchWorker] Job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`[SearchWorker] Job ${jobId} failed:`, error);

    // Update job with error
    await supabase
      .from('search_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}
