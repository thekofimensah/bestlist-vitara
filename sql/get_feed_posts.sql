-- Create a function to fetch feed posts with all necessary joins.
-- This is more reliable than client-side joins and avoids PostgREST schema detection issues.
CREATE OR REPLACE FUNCTION get_feed_posts_with_details(
    p_feed_type TEXT,
    p_limit INT,
    p_offset INT,
    p_current_user_id UUID
)
RETURNS TABLE (
    -- Define the columns that the function will return
    post_id BIGINT,
    post_created_at TIMESTAMPTZ,
    post_location TEXT,
    user_id UUID,
    item_name TEXT,
    item_image_url TEXT,
    item_rating INT,
    item_notes TEXT,
    item_is_stay_away BOOLEAN,
    list_name TEXT,
    profile_id UUID,
    profile_username TEXT,
    profile_display_name TEXT,
    profile_avatar_url TEXT,
    like_count BIGINT,
    comment_count BIGINT,
    user_liked BOOLEAN
)
AS $$
DECLARE
    following_ids UUID[];
BEGIN
    -- For 'following' feed, get the list of followed user IDs first
    IF p_feed_type = 'following' THEN
        SELECT array_agg(following_id) INTO following_ids FROM follows WHERE follower_id = p_current_user_id;
    END IF;

    RETURN QUERY
    SELECT
        p.id AS post_id,
        p.created_at AS post_created_at,
        p.location AS post_location,
        p.user_id,
        i.name AS item_name,
        i.image_url AS item_image_url,
        i.rating AS item_rating,
        i.notes AS item_notes,
        i.is_stay_away AS item_is_stay_away,
        l.name AS list_name,
        pr.id AS profile_id,
        pr.username AS profile_username,
        pr.display_name AS profile_display_name,
        pr.avatar_url AS profile_avatar_url,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments WHERE comments.post_id = p.id) AS comment_count,
        EXISTS(SELECT 1 FROM likes WHERE likes.post_id = p.id AND likes.user_id = p_current_user_id) AS user_liked
    FROM
        posts AS p
    JOIN
        items AS i ON p.item_id = i.id
    JOIN
        lists AS l ON p.list_id = l.id
    JOIN
        profiles AS pr ON p.user_id = pr.id
    WHERE
        p.is_public = TRUE
        AND
        (p_feed_type = 'for_you' OR (p_feed_type = 'following' AND p.user_id = ANY(COALESCE(following_ids, '{}'))))
    ORDER BY
        p.created_at DESC
    LIMIT
        p_limit
    OFFSET
        p_offset;
END;
$$ LANGUAGE plpgsql;
