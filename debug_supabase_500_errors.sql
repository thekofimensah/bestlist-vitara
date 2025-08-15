-- Debug Supabase 500 errors - check for schema and constraint issues

-- 1. Check if the new columns exist and are properly set up
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'items' 
  AND column_name IN ('is_first_in_world', 'first_in_world_achievement_id')
ORDER BY column_name;

-- 2. Check foreign key constraints
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'items'
  AND kcu.column_name IN ('first_in_world_achievement_id');

-- 3. Check for invalid data in the new columns
SELECT 
  id,
  is_first_in_world,
  first_in_world_achievement_id,
  CASE 
    WHEN first_in_world_achievement_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM achievements WHERE id = first_in_world_achievement_id)
    THEN 'INVALID_FK'
    ELSE 'OK'
  END as status
FROM items 
WHERE is_first_in_world IS NOT NULL 
   OR first_in_world_achievement_id IS NOT NULL
LIMIT 10;

-- 4. Check current RLS policies for conflicts
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('items', 'posts', 'lists')
ORDER BY tablename, policyname;

-- 5. Test a simple insert to see what fails
-- (Comment out after first run if it fails)
/*
INSERT INTO items (
  list_id, 
  name, 
  is_first_in_world, 
  first_in_world_achievement_id
) 
SELECT 
  l.id,
  'Test Item',
  false,
  NULL
FROM lists l 
WHERE l.user_id = auth.uid()
LIMIT 1;
*/

-- 6. Check if there are any problematic triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('items', 'posts')
ORDER BY event_object_table, trigger_name;
