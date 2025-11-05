-- Create search_jobs table for async tweet fetching
CREATE TABLE IF NOT EXISTS search_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  tweets_found INTEGER DEFAULT 0,
  pages_fetched INTEGER DEFAULT 0,
  error_message TEXT,
  result JSONB, -- Final analysis result
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS search_jobs_user_id_idx ON search_jobs(user_id);
CREATE INDEX IF NOT EXISTS search_jobs_status_idx ON search_jobs(status);
CREATE INDEX IF NOT EXISTS search_jobs_created_at_idx ON search_jobs(created_at DESC);

-- RLS policies
ALTER TABLE search_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own jobs
CREATE POLICY "Users can view their own search jobs"
  ON search_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create search jobs"
  ON search_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- System can update any job (for background worker)
CREATE POLICY "System can update search jobs"
  ON search_jobs FOR UPDATE
  USING (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_search_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_jobs_updated_at
  BEFORE UPDATE ON search_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_search_jobs_updated_at();

-- Comments
COMMENT ON TABLE search_jobs IS 'Background jobs for async tweet fetching and analysis';
COMMENT ON COLUMN search_jobs.status IS 'Job status: queued, processing, completed, failed';
COMMENT ON COLUMN search_jobs.progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN search_jobs.result IS 'Final analysis result (trades, metrics, etc)';
