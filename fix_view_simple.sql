-- Simple fix for user_achievements_fast view
-- Don't group records, just show each achievement record with achievement details

CREATE OR REPLACE VIEW user_achievements_fast AS
SELECT 
  ua.user_id,
  ua.achievement_id,
  ua.count,
  ua.earned_at,
  ua.progress_data,
  ua.item_id,  -- Include item_id for debugging
  a.name,
  a.description,
  a.icon,
  a.rarity,
  a.category,
  a.reward_points
FROM user_achievements ua
LEFT JOIN achievements a ON ua.achievement_id = a.id  -- LEFT JOIN to include orphaned records
ORDER BY ua.earned_at DESC;

-- This should show ALL records from user_achievements with achievement details
-- No filtering, no grouping - just everything
