# 🔄 Achievement Repeatability Migration

## Overview

This migration moves the `isRepeatable` logic from hardcoded JavaScript to a database-driven approach, making the achievement system more maintainable and flexible.

## ✅ What Changed

### 1. **Database Schema Enhancement**
- Added `is_repeatable BOOLEAN DEFAULT FALSE` column to `achievements` table
- Updated existing achievements to set appropriate repeatability
- Added database index for performance

### 2. **Code Improvements**
- Removed `isRepeatable` parameter from `awardAchievement()` function
- Achievement repeatability is now fetched from database
- Cleaner, more maintainable code

## 🚀 Benefits

### **Data-Driven Architecture**
- All achievement properties are now stored in one place (database)
- No more hardcoded logic scattered in JavaScript
- Easy to modify achievement behavior without code changes

### **Better Maintainability**
- Single source of truth for achievement configuration
- Easier to add new repeatable achievements
- Database queries can easily filter by repeatability

### **Improved Performance**
- Added database index for `is_repeatable` column
- Reduced redundant logic checks

## 📋 Migration Steps

### 1. **Run Database Migration**
```sql
-- Execute this in your Supabase SQL editor
\i sql/add_is_repeatable_to_achievements.sql
```

### 2. **Verify Migration**
```sql
-- Check that the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'achievements' AND column_name = 'is_repeatable';

-- Check which achievements are now marked as repeatable
SELECT name, is_repeatable, category 
FROM achievements 
ORDER BY is_repeatable DESC, category;
```

### 3. **Deploy Code Changes**
- The updated `useAchievements.js` hook is now database-driven
- All calls to `awardAchievement()` have been cleaned up
- No breaking changes to the public API

## 🎯 Which Achievements Are Repeatable

Based on the migration script, these achievements are automatically set as repeatable:

- **"First in the World"** - Users can discover multiple unique products
- **"Globetrotter"** - Users can visit multiple countries  
- **Daily/Streak achievements** - By nature, these are designed to be repeated
- **Sign-in achievements with daily triggers** - Daily login rewards

## 🔧 Adding New Repeatable Achievements

### Option 1: Database Insert (Recommended)
```sql
INSERT INTO achievements (name, description, icon, category, criteria, is_repeatable, reward_points)
VALUES (
  'Coffee Connoisseur',
  'Discover 10 different coffee varieties',
  '☕',
  'discovery',
  '{"type": "counter", "field": "coffee_items", "target": 10}',
  true,  -- This makes it repeatable
  50
);
```

### Option 2: Update Existing Achievement
```sql
UPDATE achievements 
SET is_repeatable = true 
WHERE name = 'Your Achievement Name';
```

## 🧪 Testing

You can test the new system with:

```sql
-- Create a test repeatable achievement
INSERT INTO achievements (name, description, is_repeatable, active) 
VALUES ('Test Repeatable', 'Test achievement', true, true);

-- Test the JavaScript code by triggering achievements
-- The system will now automatically check the database for repeatability
```

## 🎉 Result

Your achievement system is now:
- ✅ **Database-driven** instead of hardcoded
- ✅ **More maintainable** and flexible
- ✅ **Better performing** with proper indexing
- ✅ **Easier to extend** with new repeatable achievements

The migration is backward-compatible and requires no changes to your existing achievement triggering logic!