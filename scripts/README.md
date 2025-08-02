# Supabase Feed Performance Test

This script tests the performance difference between loading feed data with and without the `image_url` column from your Supabase database.

## What it tests

The script compares three approaches:

1. **WITH image_url**: Current approach - loads all columns including `image_url`
2. **WITHOUT image_url**: Excludes `image_url` column to test performance impact
3. **BULK queries**: Optimized approach using bulk queries instead of individual queries per post

## Setup

1. **Install Python dependencies**:
   ```bash
   cd scripts
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   Create a `.env` file in the project root with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Running the test

```bash
cd scripts
python speed_test_simple.py
```

## What the test does

1. **Loads 5 posts** from your `posts` table
2. **For each post**, it queries related data from:
   - `items` table (with/without `image_url`)
   - `lists` table
   - `users` table
   - `profiles` table
   - `likes` table (count)
   - `comments` table (count)

3. **Measures execution time** for each approach
4. **Runs multiple iterations** to get average performance
5. **Calculates improvement percentages** and time savings

## Expected results

The test will show you:
- **Average execution time** for each approach
- **Performance improvement** when excluding `image_url`
- **Query count reduction** with bulk queries
- **Statistical analysis** (min, max, standard deviation)

## Interpreting results

- **If removing `image_url` shows significant improvement**: Consider lazy loading images or using separate image endpoints
- **If bulk queries are much faster**: Consider optimizing your current query structure
- **If all approaches are similar**: The current approach is already well-optimized

## Database requirements

Your Supabase database should have these tables:
- `posts` (with columns: id, user_id, item_id, list_id, location, created_at, is_public)
- `items` (with columns: id, name, image_url, rating, notes, tags, is_stay_away)
- `lists` (with columns: id, name)
- `users` (with columns: id, email)
- `profiles` (with columns: id, username, display_name, avatar_url)
- `likes` (with columns: post_id, user_id)
- `comments` (with columns: post_id, user_id, content)

## Troubleshooting

- **"No posts found"**: Make sure you have public posts in your database
- **Authentication errors**: Check your Supabase credentials
- **Missing tables**: Ensure all required tables exist in your database 