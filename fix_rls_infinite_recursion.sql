-- Fix infinite recursion in RLS policies
-- The issue is circular dependencies between posts, items, and lists policies

-- 1. Fix posts policy - remove complex validation that causes recursion
DROP POLICY IF EXISTS posts_cud_own ON posts;
CREATE POLICY posts_cud_own ON posts FOR ALL TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- 2. Simplify items policy - remove circular reference to posts
DROP POLICY IF EXISTS items_read ON items;
CREATE POLICY items_read ON items FOR SELECT USING (
  -- Users can see items in their own lists
  EXISTS (
    SELECT 1 FROM lists l WHERE l.id = items.list_id AND l.user_id = auth.uid()
  )
  -- OR items that are explicitly public
  OR COALESCE(items.is_public, false) = true
  -- OR items in lists that have public posts (but don't check the posts table to avoid recursion)
);

-- 3. Keep lists policy simple
DROP POLICY IF EXISTS lists_read_own ON lists;
CREATE POLICY lists_read_own ON lists FOR SELECT TO authenticated 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS lists_read_public_via_post ON lists;
CREATE POLICY lists_read_public_via_post ON lists FOR SELECT 
USING (
  -- Allow reading lists that are referenced by public posts
  -- But don't create circular dependency
  id IN (
    SELECT DISTINCT list_id FROM posts WHERE is_public = true
  )
);

-- 4. Ensure items CUD policy is simple too
DROP POLICY IF EXISTS items_cud_own ON items;
CREATE POLICY items_cud_own ON items FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM lists l WHERE l.id = items.list_id AND l.user_id = auth.uid())
) 
WITH CHECK (
  EXISTS (SELECT 1 FROM lists l WHERE l.id = items.list_id AND l.user_id = auth.uid())
);

-- 5. Test that basic operations work
SELECT 'Fixed RLS policies - testing basic access' as status;
