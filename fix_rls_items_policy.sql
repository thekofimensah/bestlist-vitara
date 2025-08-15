-- Fix items RLS policy to properly allow users to see their own items
-- This addresses the ProfileView issue where users can't see all their own posts

-- Update items policy to allow users to always see their own items
DROP POLICY IF EXISTS items_read ON items;
CREATE POLICY items_read ON items FOR SELECT USING (
  -- Users can always see items in their own lists
  EXISTS (
    SELECT 1 FROM lists l WHERE l.id = items.list_id AND l.user_id = auth.uid()
  )
  -- OR items referenced by public posts (for general public access)
  OR EXISTS (
    SELECT 1 FROM posts p WHERE p.item_id = items.id AND p.is_public = true
  )
  -- OR items explicitly marked as public
  OR COALESCE(items.is_public, false) = true
  -- OR items that belong to posts owned by the current user (even if private)
  OR EXISTS (
    SELECT 1 FROM posts p WHERE p.item_id = items.id AND p.user_id = auth.uid()
  )
);

-- Also verify the posts policy is working correctly
-- Users should see their own posts (public and private) and public posts from others
DROP POLICY IF EXISTS posts_read ON posts;
CREATE POLICY posts_read ON posts FOR SELECT USING (
  user_id = auth.uid() OR is_public = true
);
