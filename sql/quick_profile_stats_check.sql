-- Quick Profile Stats Check
-- Run this in your Supabase SQL editor to quickly diagnose issues

-- 1. Basic table check
SELECT 
    'profile_stats table' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT user_id) as unique_users
FROM profile_stats;

-- 2. Check for missing users
SELECT 
    'Users without stats' as issue,
    COUNT(*) as count
FROM profiles p
LEFT JOIN profile_stats ps ON p.id = ps.user_id
WHERE ps.user_id IS NULL;

-- 3. Sample user stats vs actual data (replace 'your-user-id-here' with actual UUID)
WITH sample_user AS (
    SELECT 
        l.user_id,
        COUNT(DISTINCT i.id) as actual_total_items,
        COUNT(DISTINCT CASE WHEN i.image_url IS NOT NULL THEN i.id END) as actual_photos,
        COUNT(DISTINCT l.id) as actual_lists,
        ROUND(AVG(CASE WHEN i.rating > 0 THEN i.rating END)::numeric, 2) as actual_rating
    FROM lists l
    LEFT JOIN items i ON i.list_id = l.id
    WHERE l.user_id = 'your-user-id-here' -- Replace with your actual user ID
    GROUP BY l.user_id
),
stats_data AS (
    SELECT 
        total_items,
        photos_taken,
        lists_created,
        avg_rating
    FROM profile_stats 
    WHERE user_id = 'your-user-id-here' -- Replace with your actual user ID
)
SELECT 
    'Sample User Comparison' as check_type,
    su.actual_total_items,
    su.actual_photos,
    su.actual_lists,
    su.actual_rating,
    sd.total_items as stats_total_items,
    sd.photos_taken as stats_photos,
    sd.lists_created as stats_lists,
    sd.avg_rating as stats_rating,
    CASE 
        WHEN su.actual_total_items != sd.total_items THEN '❌ total_items mismatch'
        WHEN su.actual_photos != sd.photos_taken THEN '❌ photos mismatch'
        WHEN su.actual_lists != sd.lists_created THEN '❌ lists mismatch'
        WHEN ABS(COALESCE(su.actual_rating, 0) - COALESCE(sd.avg_rating, 0)) > 0.01 THEN '❌ rating mismatch'
        ELSE '✅ All stats match'
    END as status
FROM sample_user su
CROSS JOIN stats_data sd;

-- 4. Check if triggers exist
SELECT 
    'Missing Triggers' as issue,
    trigger_name
FROM (
    SELECT unnest(ARRAY[
        'trg_items_photos_stats',
        'trg_items_total_stats',
        'trg_items_rating_stats',
        'trg_lists_created_stats',
        'trg_likes_received_stats',
        'trg_new_user_stats'
    ]) as trigger_name
) expected
LEFT JOIN information_schema.triggers t ON t.trigger_name = expected.trigger_name
WHERE t.trigger_name IS NULL;

-- 5. Check if functions exist
SELECT 
    'Missing Functions' as issue,
    function_name
FROM (
    SELECT unnest(ARRAY[
        'update_photos_taken_stats',
        'update_lists_created_stats',
        'update_total_items_stats',
        'update_avg_rating_stats',
        'update_likes_received_stats',
        'ensure_profile_stats',
        'create_profile_stats_for_new_user'
    ]) as function_name
) expected
LEFT JOIN information_schema.routines r ON r.routine_name = expected.function_name
WHERE r.routine_name IS NULL;
