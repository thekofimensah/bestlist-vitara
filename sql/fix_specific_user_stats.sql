-- Fix Stats for Specific User
-- Replace the user ID below with your actual user ID: 8c1bf869-2ae9-4530-a3b2-9ff028961224

-- 1. First, let's see what the actual counts should be
WITH actual_counts AS (
    SELECT 
        l.user_id,
        COUNT(DISTINCT i.id) as actual_total_items,
        COUNT(DISTINCT CASE WHEN i.image_url IS NOT NULL THEN i.id END) as actual_photos,
        COUNT(DISTINCT l.id) as actual_lists,
        ROUND(AVG(CASE WHEN i.rating > 0 THEN i.rating END)::numeric, 2) as actual_rating,
        COUNT(DISTINCT likes.id) as actual_likes
    FROM lists l
    LEFT JOIN items i ON i.list_id = l.id
    LEFT JOIN posts p ON p.item_id = i.id
    LEFT JOIN likes ON likes.post_id = p.id
    WHERE l.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224' -- Your user ID
    GROUP BY l.user_id
)
SELECT 
    'Current vs Actual' as comparison,
    ps.total_items as stored_total,
    ac.actual_total_items as actual_total,
    ps.photos_taken as stored_photos,
    ac.actual_photos as actual_photos,
    ps.lists_created as stored_lists,
    ac.actual_lists as actual_lists,
    ps.avg_rating as stored_rating,
    ac.actual_rating as actual_rating,
    ps.likes_received as stored_likes,
    ac.actual_likes as actual_likes
FROM profile_stats ps
CROSS JOIN actual_counts ac
WHERE ps.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224';

-- 2. Now let's fix the stats by recalculating them from the actual data
UPDATE profile_stats 
SET 
    photos_taken = (
        SELECT COUNT(DISTINCT i.id)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224' 
        AND i.image_url IS NOT NULL
    ),
    lists_created = (
        SELECT COUNT(*)
        FROM lists
        WHERE user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224'
    ),
    total_items = (
        SELECT COUNT(DISTINCT i.id)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224'
    ),
    unique_ingredients = (
        SELECT COUNT(DISTINCT i.id)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224'
    ),
    likes_received = (
        SELECT COUNT(DISTINCT likes.id)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        JOIN posts p ON p.item_id = i.id
        JOIN likes ON likes.post_id = p.id
        WHERE l.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224'
    ),
    avg_rating = (
        SELECT ROUND(AVG(i.rating)::numeric, 2)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224' 
        AND i.rating > 0
    ),
    updated_at = NOW()
WHERE user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224';

-- 3. Verify the fix worked
SELECT 
    'After Fix' as status,
    user_id,
    photos_taken,
    lists_created,
    total_items,
    unique_ingredients,
    likes_received,
    avg_rating,
    updated_at
FROM profile_stats 
WHERE user_id = '8c1bf869-2ae9-4530-a3b2-9ff028961224';

-- 4. Check if the user actually has data
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
