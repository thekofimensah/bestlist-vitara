-- Check Trigger Setup and Functionality
-- This will help identify why your stats aren't updating automatically

-- 1. Check if all required functions exist
SELECT 
    'Functions Check' as check_type,
    routine_name,
    routine_type,
    CASE WHEN routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
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
LEFT JOIN information_schema.routines r ON r.routine_name = expected.expected_function
WHERE r.routine_schema = 'public';

-- 2. Check if all required triggers exist and are attached to the right tables
SELECT 
    'Triggers Check' as check_type,
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing,
    CASE WHEN trigger_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
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
LEFT JOIN information_schema.triggers t ON t.trigger_name = expected.expected_trigger
WHERE t.trigger_schema = 'public';

-- 3. Check the actual trigger definitions to see if they're properly configured
SELECT 
    'Trigger Details' as check_type,
    t.trigger_name,
    t.event_object_table,
    t.event_manipulation,
    t.action_timing,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM information_schema.triggers t
JOIN pg_trigger pt ON pt.tgname = t.trigger_name
JOIN pg_proc p ON p.oid = pt.tgfoid
WHERE t.trigger_schema = 'public'
AND t.trigger_name IN (
    'trg_items_photos_stats',
    'trg_items_total_stats',
    'trg_items_rating_stats',
    'trg_lists_created_stats',
    'trg_likes_received_stats',
    'trg_new_user_stats'
);

-- 4. Test if a simple trigger function call works
-- This will help identify if the issue is with the functions themselves
SELECT 
    'Function Test' as test_type,
    ensure_profile_stats('8c1bf869-2ae9-4530-a3b2-9ff028961224') as test_result;

-- 5. Check if there are any errors in the function definitions
-- Look for syntax errors or other issues
SELECT 
    'Function Definition Check' as check_type,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname IN (
    'update_photos_taken_stats',
    'update_lists_created_stats',
    'update_total_items_stats',
    'update_avg_rating_stats',
    'update_likes_received_stats'
)
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 6. Check if the triggers are actually firing
-- This will show recent activity that should have triggered updates
SELECT 
    'Recent Activity Check' as check_type,
    'Last 24 hours' as time_period,
    COUNT(*) as new_items,
    COUNT(CASE WHEN i.image_url IS NOT NULL THEN 1 END) as new_photos,
    COUNT(DISTINCT l.user_id) as users_with_activity,
    MAX(i.created_at) as latest_activity
FROM items i
JOIN lists l ON i.list_id = l.id
WHERE i.created_at > NOW() - INTERVAL '24 hours';

-- 7. Check if the user has any recent activity
SELECT 
    'User Activity Check' as check_type,
    'Your User' as user_info,
    COUNT(*) as total_items,
    COUNT(CASE WHEN i.image_url IS NOT NULL THEN 1 END) as items_with_images,
    COUNT(CASE WHEN i.rating > 0 THEN 1 END) as rated_items,
    MAX(i.created_at) as latest_item_created,
    MAX(i.updated_at) as latest_item_updated
FROM items i
JOIN lists l ON i.list_id = l.id
WHERE l.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224';

-- 8. Check if there are any database errors or issues
-- Look for any failed function calls or trigger errors
SELECT 
    'Database Health Check' as check_type,
    'No specific errors to check' as note,
    'Run this to see if there are any obvious issues' as instruction;
