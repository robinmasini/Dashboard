-- Migration: Add meeting_type column to appointments table
-- Run in Supabase SQL Editor

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'visio' 
CHECK (meeting_type IN ('visio', 'agence'));

-- Optional: Add comment for documentation
COMMENT ON COLUMN appointments.meeting_type IS 'Type of meeting: visio (video call) or agence (in-person at agency)';
