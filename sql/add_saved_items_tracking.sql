-- Add saved items tracking to the items table
-- This tracks when an item is saved from another user's post

-- Add columns to track saved items
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS original_creator_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS original_item_id UUID REFERENCES public.items(id),
ADD COLUMN IF NOT EXISTS saved_from_post_id UUID REFERENCES public.posts(id),
ADD COLUMN IF NOT EXISTS is_saved_item BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS saved_at TIMESTAMP WITH TIME ZONE;

-- Create a saved_items table to track save/unsave actions with debouncing
CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  is_saved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_original_creator ON public.items(original_creator_id);
CREATE INDEX IF NOT EXISTS idx_items_is_saved ON public.items(is_saved_item);
CREATE INDEX IF NOT EXISTS idx_saved_items_user ON public.saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_post ON public.saved_items(post_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_post ON public.saved_items(user_id, post_id);

-- RLS policies for saved_items table
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved items
CREATE POLICY "Users can view their own saved items" ON public.saved_items
  FOR SELECT USING (auth.uid() = user_id);

-- Users can save items
CREATE POLICY "Users can save items" ON public.saved_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved items (save/unsave)
CREATE POLICY "Users can update their own saved items" ON public.saved_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own saved items
CREATE POLICY "Users can delete their own saved items" ON public.saved_items
  FOR DELETE USING (auth.uid() = user_id);

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
