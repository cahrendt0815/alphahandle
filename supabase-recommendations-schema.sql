-- Recommendations table for storing ticker mentions from tweets
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tweet_id TEXT NOT NULL,
  handle TEXT NOT NULL,
  ticker TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('bullish', 'bearish')),
  mentioned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  tweet_text TEXT,
  tweet_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tweet_id, ticker)  -- Prevent duplicate recommendations
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recommendations_handle ON recommendations(handle);
CREATE INDEX IF NOT EXISTS idx_recommendations_ticker ON recommendations(ticker);
CREATE INDEX IF NOT EXISTS idx_recommendations_mentioned_at ON recommendations(mentioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_tweet_id ON recommendations(tweet_id);

-- Enable Row Level Security (RLS)
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for development)
CREATE POLICY "Allow all access to recommendations"
ON recommendations
FOR ALL
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON recommendations TO anon;
GRANT ALL ON recommendations TO authenticated;
