-- Migration to Profile Stats Architecture
-- This replaces the complex aggregation queries in useUserStats.js

-- 1. Create the profile_stats table
CREATE TABLE IF NOT EXISTS profile_stats (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    photos_taken INTEGER DEFAULT 0,
    lists_created INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    unique_ingredients INTEGER DEFAULT 0,
    likes_received INTEGER DEFAULT 0,
    avg_rating NUMERIC(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Initialize stats for existing users
INSERT INTO profile_stats (user_id, photos_taken, lists_created, total_items, unique_ingredients, likes_received, avg_rating)
SELECT 
    p.id as user_id,
    COALESCE(photo_stats.photos_taken, 0) as photos_taken,
    COALESCE(list_stats.lists_created, 0) as lists_created,
    COALESCE(item_stats.total_items, 0) as total_items,
    COALESCE(item_stats.total_items, 0) as unique_ingredients, -- Using total_items for now
    COALESCE(like_stats.likes_received, 0) as likes_received,
    COALESCE(rating_stats.avg_rating, 0.0) as avg_rating
FROM profiles p
LEFT JOIN (
    -- Count photos taken
    SELECT 
        l.user_id,
        COUNT(i.id) as photos_taken
    FROM lists l
    JOIN items i ON i.list_id = l.id
    WHERE i.image_url IS NOT NULL
    GROUP BY l.user_id
) photo_stats ON photo_stats.user_id = p.id
LEFT JOIN (
    -- Count lists created
    SELECT 
        user_id,
        COUNT(id) as lists_created
    FROM lists
    GROUP BY user_id
) list_stats ON list_stats.user_id = p.id
LEFT JOIN (
    -- Count total items
    SELECT 
        l.user_id,
        COUNT(i.id) as total_items
    FROM lists l
    JOIN items i ON i.list_id = l.id
    GROUP BY l.user_id
) item_stats ON item_stats.user_id = p.id
LEFT JOIN (
    -- Count likes received
    SELECT 
        l.user_id,
        COUNT(likes.id) as likes_received
    FROM lists l
    JOIN items i ON i.list_id = l.id
    JOIN posts p ON p.item_id = i.id
    JOIN likes ON likes.post_id = p.id
    GROUP BY l.user_id
) like_stats ON like_stats.user_id = p.id
LEFT JOIN (
    -- Calculate average rating
    SELECT 
        l.user_id,
        ROUND(AVG(i.rating)::numeric, 2) as avg_rating
    FROM lists l
    JOIN items i ON i.list_id = l.id
    WHERE i.rating IS NOT NULL AND i.rating > 0
    GROUP BY l.user_id
) rating_stats ON rating_stats.user_id = p.id
ON CONFLICT (user_id) DO NOTHING;

-- 3. Create trigger functions

-- Photos taken trigger (when items with images are added/removed)
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
        SET photos_taken = photos_taken - 1,
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
            SET photos_taken = photos_taken - 1,
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
        UPDATE profile_stats
        SET lists_created = lists_created + 1,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profile_stats
        SET lists_created = lists_created - 1,
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
        UPDATE profile_stats
        SET total_items = total_items + 1,
            unique_ingredients = unique_ingredients + 1,
            updated_at = NOW()
        WHERE user_id = target_user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profile_stats
        SET total_items = total_items - 1,
            unique_ingredients = unique_ingredients - 1,
            updated_at = NOW()
        WHERE user_id = target_user_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Average rating recalculation trigger
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

-- Likes received trigger
CREATE OR REPLACE FUNCTION update_likes_received_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the user_id from the post's item's list
    IF TG_OP = 'DELETE' THEN
        SELECT l.user_id INTO target_user_id
        FROM posts p
        JOIN items i ON i.id = p.item_id
        JOIN lists l ON l.id = i.list_id
        WHERE p.id = OLD.post_id;
    ELSE
        SELECT l.user_id INTO target_user_id
        FROM posts p
        JOIN items i ON i.id = p.item_id
        JOIN lists l ON l.id = i.list_id
        WHERE p.id = NEW.post_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        UPDATE profile_stats
        SET likes_received = likes_received + 1,
            updated_at = NOW()
        WHERE user_id = target_user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profile_stats
        SET likes_received = likes_received - 1,
            updated_at = NOW()
        WHERE user_id = target_user_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create triggers

-- Items triggers (for photos, total items, ratings)
CREATE TRIGGER trg_items_photos_stats
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION update_photos_taken_stats();

CREATE TRIGGER trg_items_total_stats
    AFTER INSERT OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION update_total_items_stats();

CREATE TRIGGER trg_items_rating_stats
    AFTER INSERT OR UPDATE OF rating OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION update_avg_rating_stats();

-- Lists triggers
CREATE TRIGGER trg_lists_created_stats
    AFTER INSERT OR DELETE ON lists
    FOR EACH ROW EXECUTE FUNCTION update_lists_created_stats();

-- Likes triggers
CREATE TRIGGER trg_likes_received_stats
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_likes_received_stats();

-- 5. Create function to ensure user has stats row
CREATE OR REPLACE FUNCTION ensure_profile_stats(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO profile_stats (user_id)
    VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to create stats row when new user signs up
CREATE OR REPLACE FUNCTION create_profile_stats_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profile_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_new_user_stats
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION create_profile_stats_for_new_user();

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_stats_user_id ON profile_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_stats_updated_at ON profile_stats(updated_at);