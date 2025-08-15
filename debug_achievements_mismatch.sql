-- Debug the mismatch between user_achievements and user_achievements_fast

-- 1. Check what's in the raw user_achievements table
SELECT 
  'Raw user_achievements' as source,
  user_id,
  achievement_id,
  item_id,
  count,
  earned_at,
  'N/A' as name
FROM user_achievements 
ORDER BY earned_at DESC;

-- 2. Check what's in the view
SELECT 
  'user_achievements_fast view' as source,
  user_id,
  achievement_id,
  'N/A' as item_id,
  count,
  earned_at,
  name
FROM user_achievements_fast;

-- 3. Check if achievements table has the records
SELECT 
  'achievements table' as source,
  id as achievement_id,
  name,
  icon,
  rarity
FROM achievements;

-- 4. Test a simple join to see what happens
SELECT 
  ua.user_id,
  ua.achievement_id,
  ua.item_id,
  ua.count,
  ua.earned_at,
  a.name,
  a.icon
FROM user_achievements ua
LEFT JOIN achievements a ON ua.achievement_id = a.id
ORDER BY ua.earned_at DESC;
