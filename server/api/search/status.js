/**
 * GET /api/search/status/:jobId
 * Get the status of an async search job
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

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract job ID from path: /api/search/status/abc-123
    const jobId = req.url.split('/').pop();

    if (!jobId) {
      return res.status(400).json({ error: 'Missing job ID' });
    }

    console.log(`[SearchStatus] Fetching status for job: ${jobId}`);

    // Fetch job from database
    const { data: job, error } = await supabase
      .from('search_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Job not found' });
      }
      console.error('[SearchStatus] Error fetching job:', error);
      return res.status(500).json({ error: 'Failed to fetch job status', details: error.message });
    }

    // Return job status
    return res.status(200).json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      tweetsFound: job.tweets_found,
      pagesFetched: job.pages_fetched,
      handle: job.handle,
      result: job.status === 'completed' ? job.result : null,
      error: job.error_message,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at
    });

  } catch (error) {
    console.error('[SearchStatus] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
