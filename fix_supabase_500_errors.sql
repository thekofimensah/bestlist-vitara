-- Quick fix for Supabase 500 errors
-- Run these one by one to identify and fix the issue

-- STEP 1: Remove problematic foreign key constraint if it exists
DO $$ 
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'items_first_in_world_achievement_id_fkey'
    AND table_name = 'items'
  ) THEN
    ALTER TABLE items DROP CONSTRAINT items_first_in_world_achievement_id_fkey;
    RAISE NOTICE 'Dropped foreign key constraint';
  END IF;
END $$;

-- STEP 2: Clean up any invalid data
UPDATE items 
SET first_in_world_achievement_id = NULL 
WHERE first_in_world_achievement_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM achievements WHERE id = first_in_world_achievement_id);

-- STEP 3: Re-add the foreign key constraint properly (optional)
-- Only run this if achievements table exists and is properly populated
/*
ALTER TABLE items 
ADD CONSTRAINT items_first_in_world_achievement_id_fkey 
FOREIGN KEY (first_in_world_achievement_id) 
REFERENCES achievements(id) 
ON DELETE SET NULL;
*/

-- STEP 4: Temporarily disable RLS to test if that's the issue
-- (Re-enable after testing)
/*
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
*/

-- STEP 5: Test basic operations
SELECT 'items table accessible' as test, count(*) as count FROM items LIMIT 1;
SELECT 'posts table accessible' as test, count(*) as count FROM posts LIMIT 1;
