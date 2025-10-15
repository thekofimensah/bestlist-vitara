-- Minimal changes to support saved items functionality
-- This works with your existing table structure

-- Add columns to items table to track saved items
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS original_creator_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS original_item_id UUID REFERENCES public.items(id),
ADD COLUMN IF NOT EXISTS saved_from_post_id UUID REFERENCES public.posts(id),
ADD COLUMN IF NOT EXISTS is_saved_item BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS saved_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_original_creator ON public.items(original_creator_id);
CREATE INDEX IF NOT EXISTS idx_items_is_saved ON public.items(is_saved_item);
CREATE INDEX IF NOT EXISTS idx_items_saved_from_post ON public.items(saved_from_post_id);

-- Function to get or create the "Saved Items" list for a user
CREATE OR REPLACE FUNCTION get_or_create_saved_items_list(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_list_id UUID;
BEGIN
  -- Check if saved items list already exists
  SELECT id INTO v_list_id
  FROM public.lists
  WHERE user_id = p_user_id
    AND name = 'Saved Items'
  LIMIT 1;
  
  -- If not exists, create it
  IF v_list_id IS NULL THEN
    INSERT INTO public.lists (user_id, name, color, created_at, updated_at)
    VALUES (p_user_id, 'Saved Items', '#9333EA', NOW(), NOW())
    RETURNING id INTO v_list_id;
  END IF;
  
  RETURN v_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Add a column to posts to track if a user has saved it
-- This is for quick lookups without joining the items table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS saved_by_users UUID[] DEFAULT '{}';

-- Create an index for saved_by_users array searches
CREATE INDEX IF NOT EXISTS idx_posts_saved_by ON public.posts USING GIN (saved_by_users);

-- Helper function to check if a user has saved a post
CREATE OR REPLACE FUNCTION user_has_saved_post(p_user_id UUID, p_post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.items 
    WHERE saved_from_post_id = p_post_id 
    AND list_id IN (SELECT id FROM lists WHERE user_id = p_user_id AND name = 'Saved Items')
    AND is_saved_item = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to toggle save state (for easier implementation)
CREATE OR REPLACE FUNCTION toggle_save_post(
  p_user_id UUID,
  p_post_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_list_id UUID;
  v_post RECORD;
  v_item RECORD;
  v_existing_save UUID;
  v_new_item_id UUID;
BEGIN
  -- Get or create saved items list
  v_list_id := get_or_create_saved_items_list(p_user_id);
  
  -- Check if already saved
  SELECT id INTO v_existing_save
  FROM public.items
  WHERE saved_from_post_id = p_post_id
    AND list_id = v_list_id
    AND is_saved_item = true
  LIMIT 1;
  
  IF v_existing_save IS NOT NULL THEN
    -- Unsave: delete the saved item
    DELETE FROM public.items WHERE id = v_existing_save;
    
    -- Update posts saved_by_users array
    UPDATE public.posts 
    SET saved_by_users = array_remove(saved_by_users, p_user_id)
    WHERE id = p_post_id;
    
    RETURN jsonb_build_object('saved', false, 'message', 'Item unsaved');
  ELSE
    -- Save: copy the item
    -- Get post and item details
    SELECT p.*, i.* INTO v_post
    FROM posts p
    JOIN items i ON p.item_id = i.id
    WHERE p.id = p_post_id;
    
    IF v_post IS NULL THEN
      RAISE EXCEPTION 'Post not found';
    END IF;
    
    -- Insert the saved copy
    INSERT INTO public.items (
      list_id, name, category, rating, notes, image_url, location,
      tags, species, certainty, is_stay_away,
      ai_product_name, ai_brand, ai_category, ai_confidence,
      ai_description, ai_tags, ai_allergens, ai_lookup_status,
      user_product_name, user_description, user_tags, user_allergens,
      place_name, latitude, longitude, price, currency_code,
      detailed_breakdown, rarity, photo_date_time, photo_location_source,
      -- Saved item specific fields
      original_creator_id, original_item_id, saved_from_post_id,
      is_saved_item, saved_at,
      created_at
    )
    SELECT
      v_list_id, name, category, rating, notes, image_url, location,
      tags, species, certainty, is_stay_away,
      ai_product_name, ai_brand, ai_category, ai_confidence,
      ai_description, ai_tags, ai_allergens, ai_lookup_status,
      user_product_name, user_description, user_tags, user_allergens,
      place_name, latitude, longitude, price, currency_code,
      detailed_breakdown, rarity, photo_date_time, photo_location_source,
      -- Set saved item fields
      v_post.user_id, v_post.item_id, p_post_id,
      true, NOW(),
      NOW()
    FROM items
    WHERE id = v_post.item_id
    RETURNING id INTO v_new_item_id;
    
    -- Update posts saved_by_users array
    UPDATE public.posts 
    SET saved_by_users = array_append(saved_by_users, p_user_id)
    WHERE id = p_post_id
      AND NOT (p_user_id = ANY(saved_by_users)); -- Avoid duplicates
    
    RETURN jsonb_build_object(
      'saved', true, 
      'message', 'Item saved',
      'new_item_id', v_new_item_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
