-- Add first-in-world tracking to items table
-- This allows us to permanently mark items that achieved "first in world" status

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS is_first_in_world BOOLEAN DEFAULT false;

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS first_in_world_achievement_id UUID REFERENCES achievements(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_items_first_in_world ON items(is_first_in_world) WHERE is_first_in_world = true;

-- Add comment for documentation
COMMENT ON COLUMN items.is_first_in_world IS 'Marks items that were the first of their kind to be photographed/catalogued';
COMMENT ON COLUMN items.first_in_world_achievement_id IS 'References the specific achievement earned for being first in world';
