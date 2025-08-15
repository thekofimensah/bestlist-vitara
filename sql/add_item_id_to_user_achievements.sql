-- OPTIMIZED HYBRID APPROACH: Item tracking + Performance
-- Maintains both user-level totals (fast) and item-specific records (detailed)

-- 1. Add item_id column to existing user_achievements table
ALTER TABLE user_achievements 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE CASCADE;

-- 2. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_item_id ON user_achievements(item_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_item ON user_achievements(user_id, item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_total ON user_achievements(user_id, achievement_id) WHERE item_id IS NULL;

-- 3. SIMPLIFIED: No need for items_with_achievements view
-- We can query user_achievements directly when needed:
-- SELECT ua.*, a.name, a.icon FROM user_achievements ua 
-- JOIN achievements a ON ua.achievement_id = a.id 
-- WHERE ua.item_id = ? AND ua.item_id IS NOT NULL;

-- 4. OPTIMIZED function to award item achievement with dual tracking
CREATE OR REPLACE FUNCTION award_item_achievement(
  p_item_id UUID,
  p_user_id UUID,
  p_achievement_id UUID,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item_achievement_id UUID;
  v_current_count INTEGER;
BEGIN
  -- 1. Insert item-specific achievement record
  INSERT INTO user_achievements (user_id, achievement_id, earned_at, progress_data, item_id, count)
  VALUES (p_user_id, p_achievement_id, NOW(), p_metadata, p_item_id, 1)
  ON CONFLICT (user_id, achievement_id, item_id) 
  DO UPDATE SET 
    progress_data = EXCLUDED.progress_data,
    earned_at = NOW()
  RETURNING id INTO v_item_achievement_id;
  
  -- 2. Update or create user-level total (item_id = NULL for fast lookups)
  INSERT INTO user_achievements (user_id, achievement_id, earned_at, progress_data, item_id, count)
  VALUES (p_user_id, p_achievement_id, NOW(), 
          jsonb_build_object('type', 'user_total', 'last_item_id', p_item_id), 
          NULL, 1)
  ON CONFLICT (user_id, achievement_id, item_id) 
  DO UPDATE SET 
    count = user_achievements.count + 1,
    earned_at = NOW(),
    progress_data = jsonb_build_object(
      'type', 'user_total', 
      'last_item_id', p_item_id,
      'total_items', user_achievements.count + 1
    );
  
  RETURN v_item_achievement_id;
END;
$$;

-- 5. Function to get user's FAST achievement counts (from user-level records)
CREATE OR REPLACE FUNCTION get_user_achievement_summary(p_user_id UUID)
RETURNS TABLE (
  achievement_id UUID,
  total_count INTEGER,
  last_earned TIMESTAMP WITH TIME ZONE,
  achievement_name TEXT,
  achievement_icon TEXT,
  achievement_rarity TEXT
) LANGUAGE sql STABLE AS $$
  -- Get user totals (item_id = NULL) for fast display
  SELECT 
    ua.achievement_id,
    ua.count as total_count,
    ua.earned_at as last_earned,
    a.name as achievement_name,
    a.icon as achievement_icon,
    a.rarity as achievement_rarity
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.user_id = p_user_id 
    AND ua.item_id IS NULL  -- Only user-level totals
  ORDER BY ua.earned_at DESC;
$$;

-- 6. Cleanup function to maintain count consistency when items are deleted
CREATE OR REPLACE FUNCTION cleanup_achievement_counts_on_item_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- When an item-specific achievement is deleted (via CASCADE),
  -- decrement the user-level total count
  UPDATE user_achievements 
  SET count = GREATEST(0, count - 1)
  WHERE user_id = OLD.user_id 
    AND achievement_id = OLD.achievement_id 
    AND item_id IS NULL;  -- Update the user total record
  
  RETURN OLD;
END;
$$;

-- 7. Create trigger to maintain consistency
DROP TRIGGER IF EXISTS achievement_count_cleanup_trigger ON user_achievements;
CREATE TRIGGER achievement_count_cleanup_trigger
  AFTER DELETE ON user_achievements
  FOR EACH ROW
  WHEN (OLD.item_id IS NOT NULL)  -- Only for item-specific deletions
  EXECUTE FUNCTION cleanup_achievement_counts_on_item_delete();

-- 8. Create partial unique indexes to handle dual tracking (PostgreSQL compatible)
-- Drop any existing constraint first
ALTER TABLE user_achievements 
DROP CONSTRAINT IF EXISTS unique_user_achievement_item;

-- Create separate partial unique indexes:
-- 1. Ensure only one user-level total per achievement (item_id = NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_achievements_unique_total
ON user_achievements(user_id, achievement_id) 
WHERE item_id IS NULL;

-- 2. Ensure only one achievement per specific item (item_id = SET)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_achievements_unique_item
ON user_achievements(user_id, achievement_id, item_id) 
WHERE item_id IS NOT NULL;

-- 9. Optimized view for UI components (achievements dropdown)
CREATE OR REPLACE VIEW user_achievements_fast AS
SELECT 
  ua.user_id,
  ua.achievement_id,
  ua.count,
  ua.earned_at,
  ua.progress_data,
  a.name,
  a.description,
  a.icon,
  a.rarity,
  a.category,
  a.reward_points
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.item_id IS NULL  -- Only user totals for fast display
ORDER BY ua.earned_at DESC;

-- 10. Comments for documentation
COMMENT ON COLUMN user_achievements.item_id IS 
'NULL = user-level total count (fast lookup), SET = specific item achievement (detailed tracking)';

COMMENT ON FUNCTION award_item_achievement IS 
'Creates both item-specific record AND updates user total for optimal performance';

COMMENT ON VIEW user_achievements_fast IS 
'Optimized view for UI components - only user totals, not item-specific records';

-- PERFORMANCE OPTIMIZATION COMPLETE
-- This dual-tracking system provides:
-- ✅ Fast UI queries (item_id = NULL records)
-- ✅ Detailed item tracking (item_id = SET records) 
-- ✅ Automatic count maintenance via triggers
-- ✅ Cascading deletes when items removed
