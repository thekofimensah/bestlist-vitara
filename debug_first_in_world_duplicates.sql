-- Debug First-in-World Duplicate Awards
-- This will help you see what's happening with duplicate "first in world" achievements

-- 1. Find users who have multiple "first in world" achievements for the same product
SELECT 
  ua.user_id,
  ua.achievement_id,
  a.name as achievement_name,
  COUNT(*) as times_awarded,
  ARRAY_AGG(ua.earned_at ORDER BY ua.earned_at) as award_dates
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
WHERE a.name ILIKE '%first%world%' 
  OR a.name ILIKE '%global%first%'
GROUP BY ua.user_id, ua.achievement_id, a.name
HAVING COUNT(*) > 1
ORDER BY times_awarded DESC;

-- 2. Check for items with the same AI product name and brand
WITH duplicate_products AS (
  SELECT 
    ai_product_name,
    ai_brand,
    COUNT(*) as item_count,
    ARRAY_AGG(id ORDER BY created_at) as item_ids,
    ARRAY_AGG(created_at ORDER BY created_at) as created_dates
  FROM items 
  WHERE ai_product_name IS NOT NULL 
    AND ai_brand IS NOT NULL
    AND image_url IS NOT NULL
  GROUP BY ai_product_name, ai_brand
  HAVING COUNT(*) > 1
)
SELECT 
  ai_product_name,
  ai_brand,
  item_count,
  item_ids,
  created_dates
FROM duplicate_products
ORDER BY item_count DESC
LIMIT 10;

-- 3. Check recent "first in world" achievements to see the pattern
SELECT 
  ua.earned_at,
  ua.user_id,
  a.name as achievement_name,
  ua.progress_data,
  p.email as user_email
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
LEFT JOIN auth.users p ON p.id = ua.user_id
WHERE a.name ILIKE '%first%world%' 
  OR a.name ILIKE '%global%first%'
ORDER BY ua.earned_at DESC
LIMIT 20;

-- 4. Find items that might be causing false "first in world" triggers
-- (items with similar but not identical product names)
WITH normalized_products AS (
  SELECT 
    id,
    ai_product_name,
    ai_brand,
    LOWER(REGEXP_REPLACE(ai_product_name, '[^a-zA-Z0-9]+', ' ', 'g')) as normalized_name,
    created_at
  FROM items 
  WHERE ai_product_name IS NOT NULL 
    AND ai_brand IS NOT NULL
    AND image_url IS NOT NULL
)
SELECT 
  np1.ai_product_name as product1,
  np2.ai_product_name as product2,
  np1.ai_brand,
  np1.normalized_name,
  np1.created_at as first_created,
  np2.created_at as second_created
FROM normalized_products np1
JOIN normalized_products np2 ON np1.normalized_name = np2.normalized_name 
  AND np1.ai_brand = np2.ai_brand 
  AND np1.id < np2.id
WHERE np1.ai_product_name != np2.ai_product_name
ORDER BY np1.created_at DESC
LIMIT 10;
