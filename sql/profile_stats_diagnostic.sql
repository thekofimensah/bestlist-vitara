-- Profile Stats Diagnostic Script
-- Run this to identify issues with your profile_stats table

-- 1. Check if profile_stats table exists and has data
SELECT 
    'Table Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_stats') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status,
    COUNT(*) as record_count
FROM profile_stats;

-- 2. Check for users without profile_stats rows
SELECT 
    'Missing Stats' as check_type,
    p.id as user_id,
    p.email,
    p.username,
    'No profile_stats row' as issue
FROM profiles p
LEFT JOIN profile_stats ps ON p.id = ps.user_id
WHERE ps.user_id IS NULL;

-- 3. Check for orphaned profile_stats rows
SELECT 
    'Orphaned Stats' as check_type,
    ps.user_id,
    'profile_stats row exists but no profile' as issue
FROM profile_stats ps
LEFT JOIN profiles p ON ps.user_id = p.id
WHERE p.id IS NULL;

-- 4. Verify trigger functions exist
SELECT 
    'Trigger Functions' as check_type,
    routine_name,
    CASE WHEN routine_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.routines 
WHERE routine_name IN (
    'update_photos_taken_stats',
    'update_lists_created_stats', 
    'update_total_items_stats',
    'update_avg_rating_stats',
    'update_likes_received_stats',
    'ensure_profile_stats',
    'create_profile_stats_for_new_user'
);

-- 5. Check if triggers are attached
SELECT 
    'Triggers' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table,
    CASE WHEN trigger_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.triggers 
WHERE trigger_name IN (
    'trg_items_photos_stats',
    'trg_items_total_stats',
    'trg_items_rating_stats',
    'trg_lists_created_stats',
    'trg_likes_received_stats',
    'trg_new_user_stats'
);

-- 6. Manual count verification for a specific user (replace USER_ID_HERE with actual user ID)
-- This will show what the actual counts should be vs what's in profile_stats
WITH user_counts AS (
    SELECT 
        'Manual Count' as source,
        COUNT(DISTINCT i.id) as total_items,
        COUNT(DISTINCT CASE WHEN i.image_url IS NOT NULL THEN i.id END) as photos_taken,
        COUNT(DISTINCT l.id) as lists_created,
        ROUND(AVG(CASE WHEN i.rating > 0 THEN i.rating END)::numeric, 2) as avg_rating
    FROM lists l
    LEFT JOIN items i ON i.list_id = l.id
    WHERE l.user_id = 'USER_ID_HERE' -- Replace with actual user ID
),
profile_stats_data AS (
    SELECT 
        'Profile Stats' as source,
        total_items,
        photos_taken,
        lists_created,
        avg_rating
    FROM profile_stats 
    WHERE user_id = 'USER_ID_HERE' -- Replace with actual user ID
)
SELECT * FROM user_counts
UNION ALL
SELECT * FROM profile_stats_data;

-- 7. Check for data inconsistencies
SELECT 
    'Data Inconsistencies' as check_type,
    ps.user_id,
    ps.total_items as stats_total_items,
    ps.photos_taken as stats_photos,
    ps.lists_created as stats_lists,
    ps.avg_rating as stats_rating,
    actual.total_items as actual_total_items,
    actual.photos_taken as actual_photos,
    actual.lists_created as actual_lists,
    actual.avg_rating as actual_rating,
    CASE 
        WHEN ps.total_items != actual.total_items THEN 'total_items mismatch'
        WHEN ps.photos_taken != actual.photos_taken THEN 'photos_taken mismatch'
        WHEN ps.lists_created != actual.lists_created THEN 'lists_created mismatch'
        WHEN ABS(COALESCE(ps.avg_rating, 0) - COALESCE(actual.avg_rating, 0)) > 0.01 THEN 'avg_rating mismatch'
        ELSE 'OK'
    END as issue
FROM profile_stats ps
CROSS JOIN LATERAL (
    SELECT 
        COUNT(DISTINCT i.id) as total_items,
        COUNT(DISTINCT CASE WHEN i.image_url IS NOT NULL THEN i.id END) as photos_taken,
        COUNT(DISTINCT l.id) as lists_created,
        ROUND(AVG(CASE WHEN i.rating > 0 THEN i.rating END)::numeric, 2) as avg_rating
    FROM lists l
    LEFT JOIN items i ON i.list_id = l.id
    WHERE l.user_id = ps.user_id
) actual
WHERE 
    ps.total_items != actual.total_items OR
    ps.photos_taken != actual.photos_taken OR
    ps.lists_created != actual.lists_created OR
    ABS(COALESCE(ps.avg_rating, 0) - COALESCE(actual.avg_rating, 0)) > 0.01;

-- 8. Check for recent activity that might not have triggered updates
SELECT 
    'Recent Activity Check' as check_type,
    'Last 24 hours' as time_period,
    COUNT(*) as new_items,
    COUNT(CASE WHEN i.image_url IS NOT NULL THEN 1 END) as new_photos,
    COUNT(DISTINCT l.user_id) as users_with_activity
FROM items i
JOIN lists l ON i.list_id = l.id
WHERE i.created_at > NOW() - INTERVAL '24 hours';

-- 9. Check if the ensure_profile_stats function works
-- (This will create a test row if it doesn't exist)
SELECT ensure_profile_stats('USER_ID_HERE'); -- Replace with actual user ID

-- 10. Manual stats refresh for a user (replace USER_ID_HERE)
-- This will recalculate all stats for a specific user
UPDATE profile_stats 
SET 
    photos_taken = (
        SELECT COUNT(DISTINCT i.id)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = 'USER_ID_HERE' AND i.image_url IS NOT NULL
    ),
    lists_created = (
        SELECT COUNT(*)
        FROM lists
        WHERE user_id = 'USER_ID_HERE'
    ),
    total_items = (
        SELECT COUNT(DISTINCT i.id)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = 'USER_ID_HERE'
    ),
    avg_rating = (
        SELECT ROUND(AVG(i.rating)::numeric, 2)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = 'USER_ID_HERE' AND i.rating > 0
    ),
    updated_at = NOW()
WHERE user_id = 'USER_ID_HERE';
