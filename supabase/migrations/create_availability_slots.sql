-- Migration: Create availability_slots table for recurring availability
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Dimanche, 1=Lundi... 6=Samedi
  start_time TEXT NOT NULL,     -- "09:00"
  end_time TEXT NOT NULL,       -- "12:00"
  slot_duration INTEGER DEFAULT 30, -- Durée d'un RDV en minutes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single freelance user)
CREATE POLICY "Allow all for availability_slots" ON availability_slots
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_availability_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_availability_slots_timestamp ON availability_slots;
CREATE TRIGGER update_availability_slots_timestamp
  BEFORE UPDATE ON availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_slots_updated_at();

-- Insert some default slots (Lundi-Vendredi 9h-12h et 14h-18h)
INSERT INTO availability_slots (day_of_week, start_time, end_time, slot_duration) VALUES
  (1, '09:00', '12:00', 30), -- Lundi matin
  (1, '14:00', '18:00', 30), -- Lundi après-midi
  (2, '09:00', '12:00', 30), -- Mardi matin
  (2, '14:00', '18:00', 30), -- Mardi après-midi
  (3, '09:00', '12:00', 30), -- Mercredi matin
  (3, '14:00', '18:00', 30), -- Mercredi après-midi
  (4, '09:00', '12:00', 30), -- Jeudi matin
  (4, '14:00', '18:00', 30), -- Jeudi après-midi
  (5, '09:00', '12:00', 30), -- Vendredi matin
  (5, '14:00', '18:00', 30); -- Vendredi après-midi
