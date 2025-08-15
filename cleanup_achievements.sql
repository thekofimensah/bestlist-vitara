-- Cleanup script for user_achievements table
-- Run this to fix any existing issues with duplicate awards and incorrect counts

-- 1. Remove duplicate item-specific achievements (keep the earliest one)
WITH duplicates AS (
  SELECT 
    user_id,
    achievement_id,
    item_id,
    MIN(id) as keep_id,
    COUNT(*) as duplicate_count
  FROM user_achievements 
  WHERE item_id IS NOT NULL
  GROUP BY user_id, achievement_id, item_id
  HAVING COUNT(*) > 1
)
DELETE FROM user_achievements ua
USING duplicates d
WHERE ua.user_id = d.user_id 
  AND ua.achievement_id = d.achievement_id 
  AND ua.item_id = d.item_id 
  AND ua.id != d.keep_id;

-- 2. Fix user-level totals to match actual item-specific counts
UPDATE user_achievements 
SET count = (
  SELECT COUNT(*)
  FROM user_achievements item_specific
  WHERE item_specific.user_id = user_achievements.user_id
    AND item_specific.achievement_id = user_achievements.achievement_id
    AND item_specific.item_id IS NOT NULL
)
WHERE item_id IS NULL;

-- 3. Create missing user-level totals for users who have item-specific achievements but no totals
INSERT INTO user_achievements (user_id, achievement_id, earned_at, progress_data, item_id, count)
SELECT 
  user_id,
  achievement_id,
  MIN(earned_at) as earned_at,
  jsonb_build_object('type', 'user_total', 'auto_created', true) as progress_data,
  NULL as item_id,
  COUNT(*) as count
FROM user_achievements
WHERE item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_achievements total
    WHERE total.user_id = user_achievements.user_id
      AND total.achievement_id = user_achievements.achievement_id
      AND total.item_id IS NULL
  )
GROUP BY user_id, achievement_id;

-- 4. Remove orphaned user totals (totals with no corresponding item-specific records)
DELETE FROM user_achievements
WHERE item_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_achievements item_specific
    WHERE item_specific.user_id = user_achievements.user_id
      AND item_specific.achievement_id = user_achievements.achievement_id
      AND item_specific.item_id IS NOT NULL
  );

-- 5. Report on the cleanup
SELECT 
  'Item-specific achievements' as record_type,
  COUNT(*) as count
FROM user_achievements
WHERE item_id IS NOT NULL

UNION ALL

SELECT 
  'User totals' as record_type,
  COUNT(*) as count
FROM user_achievements
WHERE item_id IS NULL

UNION ALL

SELECT 
  'Users with achievements' as record_type,
  COUNT(DISTINCT user_id) as count
FROM user_achievements

ORDER BY record_type;
