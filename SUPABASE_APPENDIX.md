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
  type TEXT,
  species TEXT,
  certainty INTEGER,
  tags TEXT[],
  image_url TEXT,
  rating INTEGER,
  notes TEXT,
  location TEXT,
  is_stay_away BOOLEAN DEFAULT FALSE,
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