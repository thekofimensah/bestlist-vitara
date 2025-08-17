-- Debug and Fix Stuck Offline Queue
-- This will help identify and clear stuck pending items

-- 1. Check what's in the offline queue for your user
SELECT 
    'Queue Contents' as check_type,
    id,
    type,
    created_at,
    status,
    retry_count,
    last_error,
    data
FROM offline_queue 
WHERE user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224' -- Your user ID
ORDER BY created_at DESC;

-- 2. Check queue status
SELECT 
    'Queue Status' as check_type,
    COUNT(*) as total_items,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_items,
    COUNT(CASE WHEN status = 'syncing' THEN 1 END) as syncing_items,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_items,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_items
FROM offline_queue 
WHERE user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224';

-- 3. Clear all stuck items for your user (if needed)
-- UNCOMMENT THESE LINES TO CLEAR THE QUEUE:

-- UPDATE offline_queue 
-- SET status = 'completed'
-- WHERE user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224'
-- AND status IN ('pending', 'syncing');

-- Or delete them completely:
-- DELETE FROM offline_queue 
-- WHERE user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224'
-- AND status IN ('pending', 'syncing');

-- 4. Reset a specific stuck item (replace QUEUE_ID with actual ID)
-- UPDATE offline_queue 
-- SET status = 'pending', retry_count = 0, last_error = NULL
-- WHERE id = 'QUEUE_ID_HERE'
-- AND user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224';

-- 5. Check if the offline_queue table even exists
SELECT 
    'Table Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offline_queue') 
        THEN 'EXISTS' 
        ELSE 'MISSING - This is the problem!'
    END as status;
