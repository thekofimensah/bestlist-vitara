-- Achievement Type Migration: Hybrid EVENT/STATE System
-- This migration adds robust achievement tracking that distinguishes between
-- permanent milestones (EVENT) and dynamic counts (STATE)

-- Step 1: Add the new 'type' column to the achievements table
ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'EVENT';

COMMENT ON COLUMN public.achievements.type IS 'Defines the achievement category: EVENT for permanent milestones, STATE for dynamic, recalculable achievements.';

-- Step 2: Populate the 'type' column based on existing criteria
-- Counter-based achievements are dynamic STATES (recalculated from source data)
UPDATE public.achievements
SET type = 'STATE'
WHERE criteria->>'type' = 'counter';

-- First actions, global firsts, and streaks are permanent EVENTS (logged once)
UPDATE public.achievements
SET type = 'EVENT'
WHERE criteria->>'type' IN ('first_action', 'global_first', 'streak', 'rating_diversity');

-- Step 3: Create the VIEW for live, accurate progress tracking
CREATE OR REPLACE VIEW public.v_user_achievement_progress AS
WITH 
  -- Calculate total items per user (items that exist in lists)
  total_items_count AS (
    SELECT
      l.user_id,
      COUNT(DISTINCT i.id) AS current_count
    FROM public.items i
    JOIN public.lists l ON i.list_id = l.id
    WHERE i.id IS NOT NULL
    GROUP BY l.user_id
  ),
  -- Calculate five-star items per user (excluding stay-away items)
  five_star_items_count AS (
    SELECT
      l.user_id,
      COUNT(DISTINCT i.id) AS current_count
    FROM public.items i
    JOIN public.lists l ON i.list_id = l.id
    WHERE i.rating = 5 AND (i.is_stay_away = false OR i.is_stay_away IS NULL)
    GROUP BY l.user_id
  ),
  -- Calculate detailed reviews per user (items with meaningful notes)
  detailed_reviews_count AS (
    SELECT
      l.user_id,
      COUNT(DISTINCT i.id) AS current_count
    FROM public.items i
    JOIN public.lists l ON i.list_id = l.id
    WHERE i.notes IS NOT NULL AND LENGTH(TRIM(i.notes)) > 0
    GROUP BY l.user_id
  ),
  -- Get all users and all STATE achievements to ensure complete coverage
  all_users AS (
    SELECT DISTINCT user_id FROM public.lists
  ),
  state_achievements AS (
    SELECT id, criteria->>'field' AS field, (criteria->>'target')::integer AS target
    FROM public.achievements
    WHERE type = 'STATE' AND criteria->>'type' = 'counter'
  )

-- Union all the different counts into a single view
SELECT
  au.user_id,
  sa.id AS achievement_id,
  sa.field,
  COALESCE(tic.current_count, 0) AS current_count,
  sa.target,
  CASE WHEN COALESCE(tic.current_count, 0) >= sa.target THEN true ELSE false END AS is_earned
FROM all_users au
CROSS JOIN state_achievements sa
LEFT JOIN total_items_count tic ON au.user_id = tic.user_id
WHERE sa.field = 'totalItems'

UNION ALL

SELECT
  au.user_id,
  sa.id AS achievement_id,
  sa.field,
  COALESCE(fsic.current_count, 0) AS current_count,
  sa.target,
  CASE WHEN COALESCE(fsic.current_count, 0) >= sa.target THEN true ELSE false END AS is_earned
FROM all_users au
CROSS JOIN state_achievements sa
LEFT JOIN five_star_items_count fsic ON au.user_id = fsic.user_id
WHERE sa.field = 'five_star_items'

UNION ALL

SELECT
  au.user_id,
  sa.id AS achievement_id,
  sa.field,
  COALESCE(drc.current_count, 0) AS current_count,
  sa.target,
  CASE WHEN COALESCE(drc.current_count, 0) >= sa.target THEN true ELSE false END AS is_earned
FROM all_users au
CROSS JOIN state_achievements sa
LEFT JOIN detailed_reviews_count drc ON au.user_id = drc.user_id
WHERE sa.field = 'detailed_reviews';

COMMENT ON VIEW public.v_user_achievement_progress IS 'Provides real-time progress counts for all state-based achievements by querying the source tables directly. Automatically handles deletions and ensures accuracy.';

-- Create an index to optimize the view performance
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists(user_id);
CREATE INDEX IF NOT EXISTS idx_items_list_id ON public.items(list_id);
CREATE INDEX IF NOT EXISTS idx_items_rating ON public.items(rating);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON public.achievements(type);
