-- Verify the First-in-World fix is working
-- Run this after creating a new item that should be first-in-world

-- 1. Check recent first-in-world achievements and their linked items
SELECT 
  ua.earned_at,
  ua.user_id,
  a.name as achievement_name,
  i.id as item_id,
  i.ai_product_name,
  i.ai_brand,
  i.is_first_in_world,
  i.first_in_world_achievement_id,
  CASE 
    WHEN i.is_first_in_world = true THEN '✅ Properly marked'
    ELSE '❌ Missing flag'
  END as status
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
LEFT JOIN items i ON i.first_in_world_achievement_id = ua.achievement_id
WHERE a.name ILIKE '%first%world%' 
  OR a.name ILIKE '%global%first%'
ORDER BY ua.earned_at DESC
LIMIT 10;

-- 2. Find items that should be first-in-world but aren't marked
SELECT 
  i.id,
  i.ai_product_name,
  i.ai_brand,
  i.is_first_in_world,
  i.first_in_world_achievement_id,
  i.created_at
FROM items i
WHERE i.ai_product_name IS NOT NULL 
  AND i.ai_brand IS NOT NULL
  AND i.is_first_in_world = false
  AND EXISTS (
    SELECT 1 FROM user_achievements ua
    JOIN achievements a ON a.id = ua.achievement_id
    WHERE (a.name ILIKE '%first%world%' OR a.name ILIKE '%global%first%')
      AND ua.earned_at >= i.created_at - INTERVAL '1 minute'
      AND ua.earned_at <= i.created_at + INTERVAL '5 minutes'
  )
ORDER BY i.created_at DESC
LIMIT 5;

-- 3. Quick test: Count first-in-world items vs achievements
SELECT 
  'Items marked as first-in-world' as metric,
  COUNT(*) as count
FROM items 
WHERE is_first_in_world = true

UNION ALL

SELECT 
  'First-in-world achievements awarded' as metric,
  COUNT(*) as count
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
WHERE a.name ILIKE '%first%world%' OR a.name ILIKE '%global%first%';
