-- Debug current state after all fixes

-- 1. Check if records have item_id populated
SELECT 
  id,
  user_id,
  achievement_id,
  item_id,
  count,
  earned_at
FROM user_achievements 
WHERE item_id IS NOT NULL
ORDER BY earned_at DESC 
LIMIT 10;

-- 2. Test the achievements view
SELECT * FROM user_achievements_fast LIMIT 5;