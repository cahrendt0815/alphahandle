-- Supabase Database Schema for Fintwit Performance
-- Run this SQL in your Supabase SQL Editor to create the analyses table

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handle TEXT NOT NULL UNIQUE,
  accuracy FLOAT DEFAULT 0,
  avg_return FLOAT DEFAULT 0,
  total_calls INTEGER DEFAULT 0,
  win_rate FLOAT DEFAULT 0,
  best_trade JSONB,
  worst_trade JSONB,
  recent_recommendations JSONB,
  last_updated TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on handle for faster lookups
CREATE INDEX IF NOT EXISTS idx_analyses_handle ON analyses(handle);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for development)
-- In production, you should restrict this based on your auth requirements
CREATE POLICY "Allow all access to analyses"
ON analyses
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on UPDATE
CREATE TRIGGER update_analyses_updated_at
BEFORE UPDATE ON analyses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for recent analyses
CREATE OR REPLACE VIEW recent_analyses AS
SELECT
  handle,
  avg_return,
  alpha,
  hit_ratio,
  win_rate,
  best_trade,
  worst_trade,
  data_source,
  created_at,
  updated_at
FROM analyses
ORDER BY updated_at DESC
LIMIT 50;

-- Grant permissions (adjust based on your auth setup)
-- For now, allowing anonymous access for development
GRANT ALL ON analyses TO anon;
GRANT ALL ON recent_analyses TO anon;
