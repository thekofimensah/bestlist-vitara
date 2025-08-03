-- Add notification tracking to user_achievements table
ALTER TABLE user_achievements 
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP WITH TIME ZONE;

-- Add counter for repeatable achievements
ALTER TABLE user_achievements 
ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 1;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_notified 
ON user_achievements(user_id, notified_at);

CREATE INDEX IF NOT EXISTS idx_user_achievements_earned 
ON user_achievements(user_id, earned_at);

-- Function to get pending (unnotified) achievements for a user
CREATE OR REPLACE FUNCTION get_pending_achievements(user_id_param UUID)
RETURNS TABLE (
  achievement_id UUID,
  achievement_name TEXT,
  achievement_description TEXT,
  achievement_icon TEXT,
  achievement_rarity TEXT,
  achievement_category TEXT,
  earned_at TIMESTAMP WITH TIME ZONE,
  count INTEGER,
  is_global_first BOOLEAN
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    ua.achievement_id,
    a.name,
    a.description,
    a.icon,
    a.rarity,
    a.category,
    ua.earned_at,
    ua.count,
    CASE 
      WHEN a.criteria->>'type' = 'global_first' THEN true 
      ELSE false 
    END as is_global_first
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.user_id = user_id_param 
    AND ua.notified_at IS NULL
    AND a.active = true
  ORDER BY ua.earned_at ASC;
$$;

-- Function to mark achievements as notified
CREATE OR REPLACE FUNCTION mark_achievements_notified(
  user_id_param UUID,
  achievement_ids UUID[]
)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE user_achievements 
  SET notified_at = NOW()
  WHERE user_id = user_id_param 
    AND achievement_id = ANY(achievement_ids);
$$;