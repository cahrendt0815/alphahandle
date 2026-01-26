-- Migration: Add alpha and last_analysis_date columns to analyses table
-- Run this SQL in your Supabase SQL Editor

-- Add alpha column if it doesn't exist
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS alpha FLOAT DEFAULT 0;

-- Add last_analysis_date column if it doesn't exist
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS last_analysis_date TIMESTAMP WITH TIME ZONE;

-- Update the view to include new fields
DROP VIEW IF EXISTS recent_analyses;

CREATE OR REPLACE VIEW recent_analyses AS
SELECT
  handle,
  avg_return,
  alpha,
  accuracy,
  win_rate,
  best_trade,
  worst_trade,
  last_updated,
  last_analysis_date,
  created_at
FROM analyses
ORDER BY created_at DESC
LIMIT 50;

-- Grant permissions
GRANT ALL ON recent_analyses TO anon;
