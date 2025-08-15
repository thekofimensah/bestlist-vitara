-- Fix the user_achievements_fast view to work with the new counting system
-- This will make the ProfileView achievements section work again

CREATE OR REPLACE VIEW user_achievements_fast AS
SELECT 
  ua.user_id,
  ua.achievement_id,
  COUNT(*) as count,  -- Count actual item-specific records
  MAX(ua.earned_at) as earned_at,  -- Most recent achievement
  MAX(ua.progress_data) as progress_data,
  a.name,
  a.description,
  a.icon,
  a.rarity,
  a.category,
  a.reward_points
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.item_id IS NOT NULL  -- Only count item-specific records (the real ones)
GROUP BY ua.user_id, ua.achievement_id, a.name, a.description, a.icon, a.rarity, a.category, a.reward_points
ORDER BY MAX(ua.earned_at) DESC;
