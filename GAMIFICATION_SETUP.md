# 🎮 Gamification System Setup

This guide will help you set up the complete gamification system in your Capacitor app.

## 📋 Prerequisites

- Supabase project with database access
- Existing user authentication system
- Items and lists tables already set up

## 🗄️ Database Setup

### Step 1: Run the Schema Script

Execute the SQL in `database/achievements_schema.sql` in your Supabase SQL editor:

```sql
-- This will create the achievements and user_achievements tables
-- with proper RLS policies and indexes
```

### Step 2: Populate Initial Achievements

Execute the SQL in `database/initial_achievements.sql`:

```sql
-- This will populate your achievements table with the initial
-- achievement set including discovery, quality, and milestone achievements
```

### Step 3: Verify Setup

Run this query to verify your tables are set up correctly:

```sql
SELECT 
  a.name,
  a.rarity,
  a.category,
  a.reward_points
FROM achievements a
ORDER BY a.category, a.rarity;
```

You should see 16 initial achievements across different categories.

## 🎯 How It Works

### Achievement Categories

1. **🔍 Discovery Achievements**
   - First Bite: Save your first item
   - First in the World: Be the first to photograph a specific product
   - Globetrotter: First to photograph from a new country
   - Explorer/Adventurer/Connoisseur: Milestone achievements for items discovered

2. **⭐ Quality Achievements**
   - Photographer: Take your first photo
   - Detailed Reviewer: Write notes for items
   - Five Star Hunter: Find highly rated items
   - Honest Reviewer: Use all rating levels

3. **🔥 Streak Achievements**
   - Daily/Weekly/Monthly Discoverer: Consecutive day streaks

4. **📱 Social Achievements** (Future-ready)
   - First Like, First Comment, First Follower

### Achievement Triggers

The system automatically checks for achievements when:
- ✅ Items are saved to lists (`item_saved` trigger)
- ✅ Photos are uploaded (`photo_taken` trigger)
- 🔄 More triggers can be added as needed

### Notification Types

1. **Toast Notifications**: For common achievements
   - Slides down from top
   - Shows achievement icon, name, and points
   - Auto-dismisses after 4 seconds

2. **Full-Screen Modals**: For legendary achievements
   - Dramatic entrance with confetti
   - Haptic feedback
   - Special effects for "First in World" discoveries

3. **Special Banners**: For global first discoveries
   - Shows in AddItemModal when saving
   - Celebrates being the first person globally
   - Sparkle effects and animations

## 🏆 Features Included

### ✅ Completed Features

- [x] Database schema with achievements and user achievements tables
- [x] 16 initial achievements across multiple categories
- [x] Achievement detection engine with multiple criteria types
- [x] Toast and modal notification system
- [x] Achievements gallery in user profile
- [x] "First in World" special animation in AddItemModal
- [x] Real-time achievement checking after item saves
- [x] Anti-spam notification system with cooldowns
- [x] Rarity-based notification priorities

### 🎮 Core Components

1. **`useAchievements`** - Main achievement logic hook
2. **`AchievementSystem`** - Global notification renderer
3. **`AchievementsGallery`** - Profile achievements display
4. **`FirstInWorldBanner`** - Special global first animation
5. **`AchievementToast`** - Slide-down notifications
6. **`AchievementModal`** - Full-screen celebrations

## 🚀 Testing Your Setup

### Test Achievement Triggers

1. **First Bite Achievement**: Save your very first item to any list
2. **Photographer Achievement**: Upload an item with a photo
3. **Explorer Achievement**: Save 10 different items
4. **Global First**: Try saving an item with a unique barcode/product name

### Expected Behavior

- Notifications should appear immediately after saving items
- Check the browser console for achievement logs: `🏆 New achievements unlocked:`
- Visit your profile to see earned achievements in the gallery
- Different rarities should show different notification styles

## 🔧 Customization

### Adding New Achievements

1. Add to the `achievements` table via SQL:
```sql
INSERT INTO achievements (name, description, icon, rarity, category, criteria, reward_points) 
VALUES ('Custom Achievement', 'Description', '🎯', 'rare', 'quality', '{"type": "counter", "field": "custom_stat", "target": 5}', 50);
```

2. Update the achievement checker logic in `useAchievements.js` if needed

### Modifying Criteria Types

The system supports these criteria types:
- `counter`: Check user stats against a target value
- `first_action`: Verify first-time actions
- `global_first`: Check if no one else has done this action

Add new types by extending the switch statement in `checkAchievements`.

## 🐛 Troubleshooting

### Common Issues

1. **Achievements not triggering**: Check browser console for errors in achievement checking
2. **Database errors**: Verify RLS policies allow your user to read achievements
3. **Notifications not showing**: Ensure `AchievementProvider` wraps your app component
4. **First in World not working**: Check that the barcode/product uniqueness logic matches your data structure

### Debug Mode

Enable debug logging by checking the console for messages starting with:
- `🏆 New achievements unlocked:`
- `🔍 Loading profile for username:`
- `✅ Database insert successful for all lists`

## 🎉 That's It!

Your gamification system is now ready! Users will start earning achievements as they use your app, with celebrations and notifications to keep them engaged.

The system is designed to be easily extensible - you can add new achievements, modify criteria, or enhance the notification system as your app grows.