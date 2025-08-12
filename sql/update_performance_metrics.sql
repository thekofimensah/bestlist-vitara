-- Update feed_performance_metrics table to add user_id column
-- Run this in your Supabase SQL editor

-- Add user_id column
ALTER TABLE feed_performance_metrics 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on user_id for efficient filtering
CREATE INDEX IF NOT EXISTS feed_performance_metrics_user_id_idx ON feed_performance_metrics (user_id);

-- Add comment for the new column
COMMENT ON COLUMN feed_performance_metrics.user_id IS 'User who triggered the performance measurement (for analytics)';

-- Update RLS policies to allow users to read their own metrics
DROP POLICY IF EXISTS "Allow authenticated users to read feed metrics" ON feed_performance_metrics;

CREATE POLICY "Allow users to read their own feed metrics"
ON feed_performance_metrics FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Allow admin users to read all metrics (optional)
CREATE POLICY "Allow admin users to read all feed metrics"
ON feed_performance_metrics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email IN ('admin@yourapp.com') -- Replace with your admin email
  )
);
