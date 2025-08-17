-- Fix Profile Stats Issues
-- Run this to fix common problems with your profile_stats table

-- 1. Create missing profile_stats rows for users who don't have them
INSERT INTO profile_stats (user_id, photos_taken, lists_created, total_items, unique_ingredients, likes_received, avg_rating)
SELECT 
    p.id as user_id,
    0 as photos_taken,
    0 as lists_created,
    0 as total_items,
    0 as unique_ingredients,
    0 as likes_received,
    0.0 as avg_rating
FROM profiles p
LEFT JOIN profile_stats ps ON p.id = ps.user_id
WHERE ps.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 2. Recalculate all stats for all users (this will fix any data inconsistencies)
UPDATE profile_stats 
SET 
    photos_taken = (
        SELECT COUNT(DISTINCT i.id)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = profile_stats.user_id AND i.image_url IS NOT NULL
    ),
    lists_created = (
        SELECT COUNT(*)
        FROM lists
        WHERE user_id = profile_stats.user_id
    ),
    total_items = (
        SELECT COUNT(DISTINCT i.id)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = profile_stats.user_id
    ),
    unique_ingredients = (
        SELECT COUNT(DISTINCT i.id)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = profile_stats.user_id
    ),
    avg_rating = (
        SELECT ROUND(AVG(i.rating)::numeric, 2)
        FROM lists l
        JOIN items i ON i.list_id = l.id
        WHERE l.user_id = profile_stats.user_id AND i.rating > 0
    ),
    updated_at = NOW();

-- 3. Ensure all required trigger functions exist (recreate if missing)
-- Photos taken trigger
CREATE OR REPLACE FUNCTION update_photos_taken_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the user_id from the list
    IF TG_OP = 'DELETE' THEN
        SELECT l.user_id INTO target_user_id
        FROM lists l
        WHERE l.id = OLD.list_id;
    ELSE
        SELECT l.user_id INTO target_user_id
        FROM lists l
        WHERE l.id = NEW.list_id;
    END IF;

    -- Update photos_taken count
    IF TG_OP = 'INSERT' AND NEW.image_url IS NOT NULL THEN
        UPDATE profile_stats
        SET photos_taken = photos_taken + 1,
            updated_at = NOW()
        WHERE user_id = target_user_id;
    ELSIF TG_OP = 'DELETE' AND OLD.image_url IS NOT NULL THEN
        UPDATE profile_stats
        SET photos_taken = GREATEST(0, photos_taken - 1),
            updated_at = NOW()
        WHERE user_id = target_user_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle image addition/removal
        IF OLD.image_url IS NULL AND NEW.image_url IS NOT NULL THEN
            UPDATE profile_stats
            SET photos_taken = photos_taken + 1,
                updated_at = NOW()
            WHERE user_id = target_user_id;
        ELSIF OLD.image_url IS NOT NULL AND NEW.image_url IS NULL THEN
            UPDATE profile_stats
            SET photos_taken = GREATEST(0, photos_taken - 1),
                updated_at = NOW()
            WHERE user_id = target_user_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Lists created trigger
CREATE OR REPLACE FUNCTION update_lists_created_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Ensure user has a profile_stats row
        INSERT INTO profile_stats (user_id, lists_created)
        VALUES (NEW.user_id, 1)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            lists_created = profile_stats.lists_created + 1,
            updated_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profile_stats
        SET lists_created = GREATEST(0, lists_created - 1),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Total items trigger
CREATE OR REPLACE FUNCTION update_total_items_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the user_id from the list
    IF TG_OP = 'DELETE' THEN
        SELECT l.user_id INTO target_user_id
        FROM lists l
        WHERE l.id = OLD.list_id;
    ELSE
        SELECT l.user_id INTO target_user_id
        FROM lists l
        WHERE l.id = NEW.list_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Ensure user has a profile_stats row
        INSERT INTO profile_stats (user_id, total_items, unique_ingredients)
        VALUES (target_user_id, 1, 1)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            total_items = profile_stats.total_items + 1,
            unique_ingredients = profile_stats.unique_ingredients + 1,
            updated_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profile_stats
        SET total_items = GREATEST(0, total_items - 1),
            unique_ingredients = GREATEST(0, unique_ingredients - 1),
            updated_at = NOW()
        WHERE user_id = target_user_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Average rating trigger
CREATE OR REPLACE FUNCTION update_avg_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    new_avg_rating NUMERIC(3,2);
BEGIN
    -- Get the user_id from the list
    IF TG_OP = 'DELETE' THEN
        SELECT l.user_id INTO target_user_id
        FROM lists l
        WHERE l.id = OLD.list_id;
    ELSE
        SELECT l.user_id INTO target_user_id
        FROM lists l
        WHERE l.id = NEW.list_id;
    END IF;

    -- Recalculate average rating for this user
    SELECT ROUND(AVG(i.rating)::numeric, 2) INTO new_avg_rating
    FROM lists l
    JOIN items i ON i.list_id = l.id
    WHERE l.user_id = target_user_id 
      AND i.rating IS NOT NULL 
      AND i.rating > 0;

    UPDATE profile_stats
    SET avg_rating = COALESCE(new_avg_rating, 0.0),
        updated_at = NOW()
    WHERE user_id = target_user_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate triggers (drop and recreate to ensure they're properly attached)
DROP TRIGGER IF EXISTS trg_items_photos_stats ON items;
CREATE TRIGGER trg_items_photos_stats
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION update_photos_taken_stats();

DROP TRIGGER IF EXISTS trg_items_total_stats ON items;
CREATE TRIGGER trg_items_total_stats
    AFTER INSERT OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION update_total_items_stats();

DROP TRIGGER IF EXISTS trg_items_rating_stats ON items;
CREATE TRIGGER trg_items_rating_stats
    AFTER INSERT OR UPDATE OF rating OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION update_avg_rating_stats();

DROP TRIGGER IF EXISTS trg_lists_created_stats ON lists;
CREATE TRIGGER trg_lists_created_stats
    AFTER INSERT OR DELETE ON lists
    FOR EACH ROW EXECUTE FUNCTION update_lists_created_stats();

-- 5. Create the ensure_profile_stats function if it doesn't exist
CREATE OR REPLACE FUNCTION ensure_profile_stats(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO profile_stats (user_id)
    VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for new users if it doesn't exist
CREATE OR REPLACE FUNCTION create_profile_stats_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profile_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_user_stats ON profiles;
CREATE TRIGGER trg_new_user_stats
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION create_profile_stats_for_new_user();

-- 7. Final verification - check if all users now have correct stats
SELECT 
    'Verification' as check_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN ps.user_id IS NOT NULL THEN 1 END) as users_with_stats,
    COUNT(CASE WHEN ps.user_id IS NULL THEN 1 END) as users_missing_stats
FROM profiles p
LEFT JOIN profile_stats ps ON p.id = ps.user_id;
