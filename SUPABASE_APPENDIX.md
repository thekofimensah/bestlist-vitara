# Supabase Appendix for Bestlist

This document contains all the SQL commands, triggers, functions, and useful queries for the Bestlist project.

## Table of Contents
- [Database Schema Setup](#database-schema-setup)
- [User Management & Metadata](#user-management--metadata)
- [Foreign Key Fixes](#foreign-key-fixes)
- [Useful Queries](#useful-queries)
- [Troubleshooting](#troubleshooting)

---

## Database Schema Setup

### Basic Tables Structure
```sql
-- Lists table
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#FF6B9D',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  
  -- Legacy fields for compatibility
  type TEXT,
  species TEXT,
  certainty INTEGER,
  tags TEXT[],
  category TEXT,
  
  -- Core display fields
  image_url TEXT,
  rating INTEGER,
  notes TEXT,
  location TEXT,
  is_stay_away BOOLEAN DEFAULT FALSE,
  
  -- AI Metadata fields
  ai_product_name TEXT,
  ai_brand TEXT,
  ai_category TEXT,
  ai_confidence INTEGER,
  ai_description TEXT,
  ai_tags TEXT[],
  ai_allergens TEXT[],
  ai_lookup_status TEXT,
  
  -- User Override fields
  user_product_name TEXT,
  user_description TEXT,
  user_tags TEXT[],
  
  -- Location and Photo Metadata
  place_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  photo_date_time TIMESTAMP WITH TIME ZONE,
  photo_location_source TEXT,
  
  -- Additional structured fields
  detailed_breakdown JSONB,
  rarity INTEGER DEFAULT 1,
  price DECIMAL(10, 2),
  currency_code TEXT DEFAULT 'USD',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced users table for additional metadata
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  sign_in_count INTEGER DEFAULT 0,
  user_agent TEXT,
  ip_address INET,
  sign_up_method TEXT,
  email_confirmed_at TIMESTAMP WITH TIME ZONE,
  phone_confirmed_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_ip INET,
  raw_user_meta_data JSONB,
  raw_app_meta_data JSONB,
  -- Custom fields
  location TEXT,
  device_info JSONB,
  preferences JSONB,
  timezone TEXT,
  language TEXT
);
```

---

## User Management & Metadata

### Enhanced User Metadata Trigger Functions

```sql
-- Function to handle new user creation with comprehensive metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    created_at,
    last_sign_in_at,
    sign_in_count,
    user_agent,
    ip_address,
    sign_up_method,
    email_confirmed_at,
    phone_confirmed_at,
    last_sign_in_ip,
    raw_user_meta_data,
    raw_app_meta_data
  )
  VALUES (
    new.id, 
    new.email, 
    new.created_at,
    new.last_sign_in_at,
    COALESCE(new.raw_app_meta_data->>'sign_in_count', '0')::int,
    new.raw_user_meta_data->>'user_agent',
    new.raw_user_meta_data->>'ip_address',
    new.raw_user_meta_data->>'sign_up_method',
    new.email_confirmed_at,
    new.phone_confirmed_at,
    new.raw_user_meta_data->>'last_sign_in_ip',
    new.raw_user_meta_data,
    new.raw_app_meta_data
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user metadata on each sign in
CREATE OR REPLACE FUNCTION public.handle_user_sign_in()
RETURNS trigger AS $$
BEGIN
  -- Update existing user record with new sign in data
  UPDATE public.users 
  SET 
    last_sign_in_at = new.last_sign_in_at,
    sign_in_count = COALESCE(new.raw_app_meta_data->>'sign_in_count', '0')::int,
    last_sign_in_ip = new.raw_user_meta_data->>'last_sign_in_ip',
    raw_user_meta_data = new.raw_user_meta_data,
    raw_app_meta_data = new.raw_app_meta_data,
    updated_at = NOW()
  WHERE id = new.id;
  
  -- If user doesn't exist in our table, create them
  IF NOT FOUND THEN
    INSERT INTO public.users (
      id, 
      email, 
      created_at,
      last_sign_in_at,
      sign_in_count,
      user_agent,
      ip_address,
      sign_up_method,
      email_confirmed_at,
      phone_confirmed_at,
      last_sign_in_ip,
      raw_user_meta_data,
      raw_app_meta_data
    )
    VALUES (
      new.id, 
      new.email, 
      new.created_at,
      new.last_sign_in_at,
      COALESCE(new.raw_app_meta_data->>'sign_in_count', '0')::int,
      new.raw_user_meta_data->>'user_agent',
      new.raw_user_meta_data->>'ip_address',
      new.raw_user_meta_data->>'sign_up_method',
      new.email_confirmed_at,
      new.phone_confirmed_at,
      new.raw_user_meta_data->>'last_sign_in_ip',
      new.raw_user_meta_data,
      new.raw_app_meta_data
    );
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Create the Triggers

```sql
-- Trigger for new user sign up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for user sign in (updates existing records)
CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_sign_in();
```

### Add Existing Users to Custom Table

```sql
-- Insert existing users from auth.users into your custom users table
INSERT INTO public.users (id, email, created_at)
SELECT id, email, created_at 
FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.users);
```

---

## Foreign Key Fixes

### Fix Lists Table Foreign Key (if pointing to wrong table)

```sql
-- Drop the existing foreign key constraint (if it exists)
ALTER TABLE lists DROP CONSTRAINT IF EXISTS lists_user_id_fkey;

-- Add new foreign key constraint to reference auth.users
ALTER TABLE lists ADD CONSTRAINT lists_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### Clean Up Invalid Data (if needed)

```sql
-- Check for invalid user references
SELECT l.id, l.name, l.user_id 
FROM lists l 
WHERE l.user_id NOT IN (SELECT id FROM auth.users);

-- Delete lists with invalid user references (if needed)
DELETE FROM lists 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Update lists to use valid user_id (replace with actual user_id)
UPDATE lists 
SET user_id = 'your-actual-user-id-here' 
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

---

## Useful Queries

### Check Database State

```sql
-- Check what users exist in auth.users
SELECT id, email, created_at FROM auth.users;

-- Check what users exist in your custom users table
SELECT id, email, created_at FROM users;

-- Check what lists exist and their user_ids
SELECT id, name, user_id FROM lists;

-- Check for orphaned lists (lists without valid users)
SELECT l.id, l.name, l.user_id 
FROM lists l 
LEFT JOIN auth.users u ON l.user_id = u.id 
WHERE u.id IS NULL;
```

### User Analytics

```sql
-- Get user sign-in statistics
SELECT 
  u.email,
  u.sign_in_count,
  u.created_at,
  u.last_sign_in_at,
  COUNT(l.id) as list_count,
  COUNT(i.id) as item_count
FROM users u
LEFT JOIN lists l ON u.id = l.user_id
LEFT JOIN items i ON l.id = i.list_id
GROUP BY u.id, u.email, u.sign_in_count, u.created_at, u.last_sign_in_at
ORDER BY u.sign_in_count DESC;

-- Get user device information
SELECT 
  email,
  user_agent,
  device_info,
  timezone,
  language
FROM users 
WHERE device_info IS NOT NULL;
```

### List and Item Analytics

```sql
-- Get list statistics
SELECT 
  l.name,
  l.color,
  COUNT(i.id) as total_items,
  COUNT(CASE WHEN i.is_stay_away = true THEN 1 END) as stay_away_count,
  COUNT(CASE WHEN i.is_stay_away = false THEN 1 END) as favorite_count,
  AVG(i.rating) as avg_rating
FROM lists l
LEFT JOIN items i ON l.id = i.list_id
GROUP BY l.id, l.name, l.color
ORDER BY total_items DESC;

-- Get rating distribution
SELECT 
  rating,
  COUNT(*) as count,
  CASE 
    WHEN rating < 0 THEN 'Stay Away'
    WHEN rating = 0 THEN 'Neutral'
    ELSE 'Favorite'
  END as category
FROM items 
WHERE rating IS NOT NULL
GROUP BY rating
ORDER BY rating;
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Foreign Key Constraint Violation
**Error**: `insert or update on table "lists" violates foreign key constraint "lists_user_id_fkey"`

**Solution**:
```sql
-- Check if user exists in auth.users
SELECT id FROM auth.users WHERE id = 'user-id-here';

-- Fix foreign key to point to auth.users
ALTER TABLE lists DROP CONSTRAINT lists_user_id_fkey;
ALTER TABLE lists ADD CONSTRAINT lists_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);
```

#### 2. Missing User in Custom Table
**Error**: User exists in auth.users but not in custom users table

**Solution**:
```sql
-- Add missing user
INSERT INTO public.users (id, email, created_at)
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'user-id-here';
```

#### 3. Trigger Not Firing
**Check if triggers exist**:
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

**Recreate triggers if needed**:
```sql
-- Drop and recreate triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Then run the trigger creation commands above
```

### Reset Everything (Nuclear Option)

```sql
-- WARNING: This will delete all data!
-- Only use for development/testing

-- Drop all tables
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS lists CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_sign_in() CASCADE;

-- Then recreate everything using the schema above
```

---

## Environment Variables

Make sure these are set in your `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Notes

- All triggers automatically capture metadata that Supabase Auth provides
- Custom metadata (location, device info, preferences) should be added via your app code
- The foreign key should always reference `auth.users`, not the custom `users` table
- The custom `users` table is for additional metadata, not for authentication 

### Critical Performance Indexes (REQUIRED)
**⚠️ URGENT: Run these to fix 22+ second query times:**

```sql
-- Essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_lists_user_id ON public.lists(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_created_at ON public.lists(created_at DESC);

-- CRITICAL: Items table indexes (fixes 22 second queries)
CREATE INDEX IF NOT EXISTS idx_items_list_id ON public.items(list_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_list_created ON public.items(list_id, created_at DESC);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_items_user_lists ON public.items(list_id) 
  INCLUDE (id, name, rating, is_stay_away, created_at);
```

### Update Existing Database Schema
**⚠️ REQUIRED: Add missing fields to existing items table:**

```sql
-- Add AI Metadata fields
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_product_name TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_brand TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_category TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_confidence INTEGER;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_tags TEXT[];
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_allergens TEXT[];
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_lookup_status TEXT;

-- Add User Override fields
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS user_product_name TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS user_description TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS user_tags TEXT[];

-- Add Location and Photo Metadata
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS place_name TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS photo_date_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS photo_location_source TEXT;

-- Add Additional structured fields
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS detailed_breakdown JSONB;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS rarity INTEGER DEFAULT 1;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS category TEXT;

-- Add updated_at if missing
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

### Database Timeout Settings
**⚠️ URGENT: Increase database timeout for slow connections:**

```sql
-- Increase statement timeout for current session (temporary fix)
SET statement_timeout = '60s';

-- For permanent setting, contact Supabase support or upgrade plan
-- Alternatively, these settings may be available in Dashboard → Settings → Database
``` 

---

## Feed System Tables & Setup

### Core Feed Tables

```sql
-- User profiles (extend existing auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  CONSTRAINT username_length CHECK (length(username) >= 3 AND length(username) <= 20)
);

-- Posts (public items from lists)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Content moderation flags
CREATE TABLE IF NOT EXISTS public.content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, reviewed, dismissed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Update Existing Tables for Feed Support

```sql
-- Add privacy settings to items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add privacy settings to lists  
ALTER TABLE public.lists ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
```

### Feed Performance Indexes

```sql
-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_public ON public.posts(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_item_id ON public.posts(item_id);

-- Likes table indexes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Follows table indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles(lower(username));
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all feed tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts policies
CREATE POLICY "Public posts are viewable by everyone" ON public.posts
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own posts" ON public.posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- Likes policies  
CREATE POLICY "Anyone can view likes" ON public.likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Users can add comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Anyone can view follows" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);
```

### Useful Feed Queries

```sql
-- Get feed posts with user data and engagement counts
CREATE OR REPLACE VIEW feed_posts_view AS
SELECT 
  p.*,
  u.email as user_email,
  pr.username,
  pr.display_name,
  pr.avatar_url,
  i.name as item_name,
  i.image_url,
  i.rating,
  i.notes,
  i.tags,
  i.is_stay_away,
  l.name as list_name,
  (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
  (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
FROM posts p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN items i ON p.item_id = i.id
LEFT JOIN lists l ON p.list_id = l.id
WHERE p.is_public = true
ORDER BY p.created_at DESC;

-- Get user's feed (posts from users they follow)
CREATE OR REPLACE FUNCTION get_user_feed(user_id_param UUID, limit_param INT DEFAULT 20, offset_param INT DEFAULT 0)
RETURNS TABLE(
  post_id UUID,
  user_id UUID,
  item_id UUID,
  list_id UUID,
  user_email TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  item_name TEXT,
  image_url TEXT,
  rating INT,
  notes TEXT,
  tags TEXT[],
  is_stay_away BOOLEAN,
  list_name TEXT,
  location TEXT,
  like_count BIGINT,
  comment_count BIGINT,
  user_liked BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    p.id as post_id,
    p.user_id,
    p.item_id,
    p.list_id,
    u.email as user_email,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    i.name as item_name,
    i.image_url,
    i.rating,
    i.notes,
    i.tags,
    i.is_stay_away,
    l.name as list_name,
    p.location,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
    (SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = user_id_param) as user_liked,
    p.created_at
  FROM posts p
  LEFT JOIN auth.users u ON p.user_id = u.id
  LEFT JOIN profiles pr ON p.user_id = pr.id
  LEFT JOIN items i ON p.item_id = i.id
  LEFT JOIN lists l ON p.list_id = l.id
  WHERE p.is_public = true 
    AND (
      p.user_id IN (SELECT following_id FROM follows WHERE follower_id = user_id_param)
      OR p.user_id = user_id_param
    )
  ORDER BY p.created_at DESC
  LIMIT limit_param OFFSET offset_param;
$$;
```


Supabase Table columns:

table_name,columns
achievements,"active,reward_points,criteria,id,name,category,rarity,icon,description,is_repeatable,created_at"
app_errors,"error_type,error_message,platform,created_at,os_version,timestamp,id"
app_versions,"os_version,id,created_at,timestamp,platform,version"
comments,"id,content,post_id,parent_id,updated_at,created_at,user_id"
content_flags,"user_id,id,created_at,post_id,status,reason"
follows,"id,created_at,following_id,follower_id"
items,"place_name,user_allergens,user_tags,user_description,user_product_name,ai_lookup_status,ai_allergens,price,is_public,photo_location_source,currency_code,rating,is_stay_away,created_at,updated_at,ai_confidence,detailed_breakdown,rarity,latitude,longitude,photo_date_time,ai_tags,ai_description,ai_category,ai_brand,ai_product_name,location,notes,image_url,tags,species,category,name,id,list_id,certainty"
likes,"id,user_id,created_at,post_id"
lists,"color,name,id,user_id,created_at,updated_at"
notifications,"user_id,actor_id,reference_id,read,created_at,updated_at,type,id"
posts,"list_id,is_public,item_id,id,updated_at,location,user_id,created_at"
profile_stats,"total_items,lists_created,photos_taken,user_id,updated_at,created_at,avg_rating,likes_received,unique_ingredients"
profiles,"id,display_name,created_at,updated_at,is_private,avatar_url,username,bio"
user_achievements,"progress_data,achievement_id,user_id,id,count,notified_at,earned_at"
users,"sign_up_method,last_sign_in_at,timezone,language,email_confirmed_at,updated_at,created_at,email,name,country,id,avatar_url,preferences,device_info,raw_app_meta_data,user_agent,ip_address,raw_user_meta_data,last_sign_in_ip,phone_confirmed_at,location,sign_in_count"