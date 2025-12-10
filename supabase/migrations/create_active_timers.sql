-- Migration: Create active_timers table for cross-device timer sync
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS active_timers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  accumulated_ms BIGINT DEFAULT 0,
  is_running BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id)
);

-- Enable RLS
ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (single freelance user)
CREATE POLICY "Allow all for authenticated" ON active_timers
  FOR ALL USING (true) WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_active_timers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_active_timers_timestamp ON active_timers;
CREATE TRIGGER update_active_timers_timestamp
  BEFORE UPDATE ON active_timers
  FOR EACH ROW
  EXECUTE FUNCTION update_active_timers_updated_at();
