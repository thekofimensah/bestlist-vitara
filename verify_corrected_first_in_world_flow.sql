-- Verify the corrected First-in-World flow
-- This checks that items table updates are now the PRIMARY action

-- 1. Check items that are marked as first-in-world have corresponding user achievements
SELECT 
  'Items with first-in-world flags' as check_type,
  COUNT(*) as total_items,
  COUNT(CASE WHEN ua.id IS NOT NULL THEN 1 END) as items_with_user_achievements,
  COUNT(CASE WHEN ua.id IS NULL THEN 1 END) as items_without_user_achievements
FROM items i
LEFT JOIN user_achievements ua ON ua.achievement_id = i.first_in_world_achievement_id
  AND ua.user_id = (
    SELECT l.user_id FROM lists l WHERE l.id = i.list_id LIMIT 1
  )
WHERE i.is_first_in_world = true;

-- 2. Check user achievements that DON'T have corresponding items marked
SELECT 
  'User achievements without marked items' as check_type,
  COUNT(*) as orphaned_achievements
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
LEFT JOIN items i ON i.first_in_world_achievement_id = ua.achievement_id
WHERE (a.name ILIKE '%first%world%' OR a.name ILIKE '%global%first%')
  AND i.id IS NULL;

-- 3. Show recent first-in-world items with their status
SELECT 
  i.id as item_id,
  i.ai_product_name,
  i.ai_brand,
  i.is_first_in_world,
  i.first_in_world_achievement_id,
  i.created_at as item_created,
  ua.earned_at as achievement_earned,
  a.name as achievement_name,
  CASE 
    WHEN i.is_first_in_world = true AND ua.id IS NOT NULL THEN '✅ Complete'
    WHEN i.is_first_in_world = true AND ua.id IS NULL THEN '⚠️ Item marked, no user achievement'
    WHEN i.is_first_in_world = false AND ua.id IS NOT NULL THEN '❌ User achievement, item not marked'
    ELSE '❓ Unknown state'
  END as status
FROM items i
LEFT JOIN user_achievements ua ON ua.achievement_id = i.first_in_world_achievement_id
  AND ua.user_id = (SELECT l.user_id FROM lists l WHERE l.id = i.list_id LIMIT 1)
LEFT JOIN achievements a ON a.id = i.first_in_world_achievement_id
WHERE i.ai_product_name IS NOT NULL 
  AND i.ai_brand IS NOT NULL
  AND (i.is_first_in_world = true OR ua.id IS NOT NULL)
ORDER BY i.created_at DESC
LIMIT 10;

-- 4. Quick consistency check
SELECT 
  CASE 
    WHEN marked_items = user_achievements THEN '✅ Perfectly consistent'
    WHEN marked_items > user_achievements THEN '⚠️ More items marked than user achievements (acceptable)'
    ELSE '❌ More user achievements than marked items (problematic)'
  END as consistency_status,
  marked_items,
  user_achievements,
  ABS(marked_items - user_achievements) as difference
FROM (
  SELECT 
    (SELECT COUNT(*) FROM items WHERE is_first_in_world = true) as marked_items,
    (SELECT COUNT(*) FROM user_achievements ua 
     JOIN achievements a ON a.id = ua.achievement_id 
     WHERE a.name ILIKE '%first%world%' OR a.name ILIKE '%global%first%'
    ) as user_achievements
) counts;
