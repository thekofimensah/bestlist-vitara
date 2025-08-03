-- Add is_repeatable column to achievements table
-- This makes the system more data-driven and removes hardcoded logic

ALTER TABLE achievements 
ADD COLUMN IF NOT EXISTS is_repeatable BOOLEAN DEFAULT FALSE;

-- Update existing achievements to set their repeatability
-- Based on the current logic in the codebase

-- "First in the World" should be repeatable (you can discover multiple products)
UPDATE achievements 
SET is_repeatable = TRUE 
WHERE name = 'First in the World';

-- "Globetrotter" should be repeatable (you can visit multiple countries)
UPDATE achievements 
SET is_repeatable = TRUE 
WHERE name = 'Globetrotter';

-- "Daily Discoverer" or any daily/streak achievements should be repeatable
UPDATE achievements 
SET is_repeatable = TRUE 
WHERE name ILIKE '%daily%' OR name ILIKE '%streak%' OR criteria->>'trigger' = 'daily_sign_in';

-- Sign-in achievements with daily triggers should be repeatable
UPDATE achievements 
SET is_repeatable = TRUE 
WHERE criteria->>'type' = 'sign_in' AND criteria->>'trigger' = 'daily_sign_in';

-- Add index for performance when querying by repeatability
CREATE INDEX IF NOT EXISTS idx_achievements_is_repeatable 
ON achievements(is_repeatable);

-- Add a comment to document the column
COMMENT ON COLUMN achievements.is_repeatable IS 
'Whether this achievement can be earned multiple times by the same user';