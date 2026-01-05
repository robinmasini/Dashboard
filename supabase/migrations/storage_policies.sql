-- Storage Policies for "documents" bucket
-- Run these in Supabase SQL Editor: https://supabase.com/dashboard/project/ewcuplilytjxqqjvktcu/sql/new

-- OPTION 1: Allow ALL users (authenticated AND anon) to upload
-- This is simpler and works with the anon key

CREATE POLICY "Allow all uploads" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow all updates" ON storage.objects
FOR UPDATE TO public
USING (bucket_id = 'documents');

CREATE POLICY "Allow all deletes" ON storage.objects
FOR DELETE TO public
USING (bucket_id = 'documents');

CREATE POLICY "Allow all reads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');
