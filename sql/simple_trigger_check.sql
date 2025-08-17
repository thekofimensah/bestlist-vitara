-- Simple Trigger Check (Compatible with all PostgreSQL versions)
-- This will help identify why your stats aren't updating automatically

-- 1. Check if functions exist using pg_proc (more reliable)
SELECT 
    'Functions Check' as check_type,
    p.proname as function_name,
    CASE WHEN p.proname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
    SELECT unnest(ARRAY[
        'update_photos_taken_stats',
        'update_lists_created_stats',
        'update_total_items_stats',
        'update_avg_rating_stats',
        'update_likes_received_stats',
        'ensure_profile_stats',
        'create_profile_stats_for_new_user'
    ]) as expected_function
) expected
LEFT JOIN pg_proc p ON p.proname = expected.expected_function
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Check if triggers exist using pg_trigger (more reliable)
SELECT 
    'Triggers Check' as check_type,
    pt.tgname as trigger_name,
    p.relname as table_name,
    CASE WHEN pt.tgname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
    SELECT unnest(ARRAY[
        'trg_items_photos_stats',
        'trg_items_total_stats',
        'trg_items_rating_stats',
        'trg_lists_created_stats',
        'trg_likes_received_stats',
        'trg_new_user_stats'
    ]) as expected_trigger
) expected
LEFT JOIN pg_trigger pt ON pt.tgname = expected.expected_trigger
LEFT JOIN pg_class p ON p.oid = pt.tgrelid
WHERE pt.tgname IS NOT NULL;

-- 3. Test if the ensure_profile_stats function works
SELECT 
    'Function Test' as test_type,
    ensure_profile_stats('8c1bf869-2ae9-4530-a3b2-9ff028961224') as test_result;

-- 4. Check if your user actually has data
SELECT 
    'User Data Check' as check_type,
    COUNT(DISTINCT l.id) as total_lists,
    COUNT(DISTINCT i.id) as total_items,
    COUNT(DISTINCT CASE WHEN i.image_url IS NOT NULL THEN i.id END) as items_with_images,
    COUNT(DISTINCT CASE WHEN i.rating > 0 THEN i.id END) as rated_items,
    ROUND(AVG(CASE WHEN i.rating > 0 THEN i.rating END)::numeric, 2) as average_rating
FROM lists l
LEFT JOIN items i ON i.list_id = l.id
WHERE l.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224';

-- 5. Check recent activity that should have triggered updates
SELECT 
    'Recent Activity' as check_type,
    'Last 7 days' as time_period,
    COUNT(*) as new_items,
    COUNT(CASE WHEN i.image_url IS NOT NULL THEN 1 END) as new_photos,
    MAX(i.created_at) as latest_activity
FROM items i
JOIN lists l ON i.list_id = l.id
WHERE l.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224'
AND i.created_at > NOW() - INTERVAL '7 days';

-- 6. Check if profile_stats table has the right structure
SELECT 
    'Table Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profile_stats' 
AND table_schema = 'public'
ORDER BY ordinal_position;
