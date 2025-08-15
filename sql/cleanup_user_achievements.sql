-- Cleanup Script: Fix Incorrect Counter Data in user_achievements
-- This ONLY fixes bad data - no new tables or columns are created

-- Step 1: Fix incorrect counts in existing user_achievements records
DO $$
DECLARE
    rec RECORD;
    correct_count INTEGER;
    stored_count INTEGER;
    user_count INTEGER := 0;
    fixed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting user_achievements cleanup for STATE achievements...';
    
    -- Loop through all STATE achievements in user_achievements
    FOR rec IN 
        SELECT ua.user_id, ua.achievement_id, ua.count as stored_count, a.name as achievement_name, a.criteria
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE a.type = 'STATE'
        ORDER BY ua.user_id, ua.achievement_id
    LOOP
        user_count := user_count + 1;
        
        -- Get the correct count from the progress view
        SELECT current_count INTO correct_count
        FROM v_user_achievement_progress 
        WHERE user_id = rec.user_id AND achievement_id = rec.achievement_id;
        
        -- If no progress record found, correct count is 0
        IF correct_count IS NULL THEN
            correct_count := 0;
        END IF;
        
        -- Compare and fix if necessary
        IF rec.stored_count != correct_count THEN
            RAISE NOTICE 'Fixing user % achievement "%" - was %, should be %', 
                rec.user_id, rec.achievement_name, rec.stored_count, correct_count;
                
            -- Update the count to match reality
            UPDATE user_achievements 
            SET count = correct_count,
                progress_data = jsonb_build_object(
                    'corrected_at', NOW(),
                    'previous_count', rec.stored_count,
                    'correct_count', correct_count,
                    'correction_reason', 'hybrid_system_migration'
                )
            WHERE user_id = rec.user_id AND achievement_id = rec.achievement_id;
            
            fixed_count := fixed_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Cleanup complete: % records checked, % records fixed', user_count, fixed_count;
END $$;

-- Step 2: Remove orphaned STATE achievement records where user has 0 actual progress
-- These might exist from the old system where counters weren't decremented on deletions
DELETE FROM user_achievements ua
WHERE ua.achievement_id IN (
    SELECT id FROM achievements WHERE type = 'STATE'
)
AND NOT EXISTS (
    SELECT 1 FROM v_user_achievement_progress vp 
    WHERE vp.user_id = ua.user_id 
    AND vp.achievement_id = ua.achievement_id 
    AND vp.current_count > 0
);

-- Step 3: Add missing STATE achievement records for users who have earned them but no record exists
-- This handles cases where users earned achievements but records were lost/deleted
INSERT INTO user_achievements (user_id, achievement_id, count, earned_at, progress_data)
SELECT 
    vp.user_id,
    vp.achievement_id,
    vp.current_count,
    NOW() as earned_at,
    jsonb_build_object(
        'added_during_migration', true,
        'current_count', vp.current_count,
        'target', vp.target,
        'migration_date', NOW()
    ) as progress_data
FROM v_user_achievement_progress vp
WHERE vp.is_earned = true
AND NOT EXISTS (
    SELECT 1 FROM user_achievements ua 
    WHERE ua.user_id = vp.user_id AND ua.achievement_id = vp.achievement_id
);

-- Step 4: Show simple summary
DO $$
DECLARE
    state_records INTEGER;
    event_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO state_records FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE a.type = 'STATE';
    
    SELECT COUNT(*) INTO event_records FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE a.type = 'EVENT';
    
    RAISE NOTICE 'Summary: % STATE records, % EVENT records in user_achievements', state_records, event_records;
END $$;

-- Step 5: Verify the hybrid system is working correctly
DO $$
DECLARE
    state_count INTEGER;
    event_count INTEGER;
    progress_count INTEGER;
BEGIN
    -- Count achievements by type
    SELECT COUNT(*) INTO state_count FROM achievements WHERE type = 'STATE';
    SELECT COUNT(*) INTO event_count FROM achievements WHERE type = 'EVENT';
    
    -- Count progress records
    SELECT COUNT(DISTINCT achievement_id) INTO progress_count FROM v_user_achievement_progress;
    
    RAISE NOTICE 'Verification: % STATE achievements, % EVENT achievements', state_count, event_count;
    RAISE NOTICE 'Progress view covers % achievements', progress_count;
    
    IF progress_count >= state_count THEN
        RAISE NOTICE '✅ Hybrid system verification: PASSED';
    ELSE
        RAISE NOTICE '❌ Hybrid system verification: FAILED - Progress view missing achievements';
    END IF;
END $$;

-- Cleanup complete!
