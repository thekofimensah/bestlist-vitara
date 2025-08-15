-- Debug posts queries to understand ProfileView data inconsistencies

-- Get user ID first (replace with your actual user ID)
-- SELECT id FROM auth.users LIMIT 1;

-- 1. Count ALL posts for user (including private)
SELECT 'Total Posts (all)' as query_type, COUNT(*) as count
FROM posts 
WHERE user_id = 'YOUR_USER_ID_HERE';

-- 2. Count only PUBLIC posts for user
SELECT 'Public Posts Only' as query_type, COUNT(*) as count
FROM posts 
WHERE user_id = 'YOUR_USER_ID_HERE' 
  AND is_public = true;

-- 3. Count posts with valid items (inner join)
SELECT 'Posts with Items (inner)' as query_type, COUNT(*) as count
FROM posts p
INNER JOIN items i ON p.item_id = i.id
WHERE p.user_id = 'YOUR_USER_ID_HERE' 
  AND p.is_public = true;

-- 4. Check posts without items
SELECT 'Posts WITHOUT Items' as query_type, COUNT(*) as count
FROM posts p
LEFT JOIN items i ON p.item_id = i.id
WHERE p.user_id = 'YOUR_USER_ID_HERE' 
  AND p.is_public = true
  AND i.id IS NULL;

-- 5. Sample posts to see structure
SELECT 
  p.id,
  p.created_at,
  p.is_public,
  p.item_id,
  p.list_id,
  i.id as item_exists,
  i.name as item_name,
  l.id as list_exists,
  l.name as list_name
FROM posts p
LEFT JOIN items i ON p.item_id = i.id
LEFT JOIN lists l ON p.list_id = l.id
WHERE p.user_id = 'YOUR_USER_ID_HERE'
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. Check profile_stats vs actual counts
SELECT 
  'Profile Stats' as source,
  photos_taken,
  total_items,
  lists_created
FROM profile_stats 
WHERE user_id = 'YOUR_USER_ID_HERE';