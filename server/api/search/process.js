/**
 * POST /api/search/process
 * Process an existing search job (job is already created in DB)
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
  console.error('[SearchProcess] Missing Supabase configuration');
  console.error('[SearchProcess] SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
  console.error('[SearchProcess] SUPABASE_KEY:', supabaseKey ? 'present' : 'missing');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobId, handle, timelineMonths = 12 } = req.body;

    // Validate input
    if (!jobId) {
      return res.status(400).json({ error: 'Missing required field: jobId' });
    }

    if (!handle) {
      return res.status(400).json({ error: 'Missing required field: handle' });
    }

    console.log(`[SearchProcess] Processing job ${jobId} for @${handle}`);

    // Trigger background worker (don't wait for it)
    processSearchJob(jobId, handle, timelineMonths).catch(err => {
      console.error(`[SearchWorker] Error processing job ${jobId}:`, err);
    });

    // Return immediately
    return res.status(202).json({
      jobId: jobId,
      status: 'processing',
      message: 'Search job processing started'
    });

  } catch (error) {
    console.error('[SearchProcess] Unexpected error:', error);
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

    console.log(`[SearchWorker] Analyzing @${handle}...`);

    // Progress update: 30%
    await supabase
      .from('search_jobs')
      .update({ progress: 30 })
      .eq('id', jobId);

    // Dynamically import the ES module (fintwitService uses import/export)
    const fintwitService = await import('../../../services/fintwitService.js');
    const { analyzeHandle } = fintwitService;

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
