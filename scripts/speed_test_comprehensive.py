#!/usr/bin/env python3
"""
Comprehensive Speed Test Script for Supabase
Tests BOTH lists loading (useLists.js) and feed loading (MainScreen.jsx) processes
Replicates the exact approach used in both systems
"""

import os
import time
import statistics
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Test user ID (you'll need to replace this with a real user ID from your database)
TEST_USER_ID = "a71aeac4-f8bb-407d-ae58-02582d3b6221"  # Replace with actual user ID

def test_lists_loading_with_image_url():
    """Test lists loading WITH image_url (useLists.js approach)"""
    print("🔄 Testing LISTS loading WITH image_url (useLists.js approach)...")
    
    start_time = time.time()
    
    try:
        # Step 1: Get all lists for a user (like useLists.js does)
        print("  📋 Step 1: Fetching lists...")
        lists_response = supabase.table('lists').select('*').eq('user_id', TEST_USER_ID).order('created_at', desc=True).execute()
        
        if not lists_response.data:
            print("❌ No lists found for test user")
            return None, 0
        
        lists_data = lists_response.data
        print(f"  ✅ Found {len(lists_data)} lists")
        
        # Step 2: Single query to get all items for all lists (OPTIMIZED approach from useLists.js)
        print("  📦 Step 2: Single query for all items (WITH image_url)...")
        list_ids = [list_item['id'] for list_item in lists_data]
        
        items_response = supabase.table('items').select('*').in_('list_id', list_ids).execute()
        
        if items_response.data:
            # Step 3: Group items by list_id in memory (like useLists.js does)
            print("  🔄 Step 3: Grouping items by list_id in memory...")
            items_by_list_id = {}
            
            for item in items_response.data:
                list_id = item['list_id']
                if list_id not in items_by_list_id:
                    items_by_list_id[list_id] = []
                items_by_list_id[list_id].append(item)
            
            # Step 4: Build lists with their items (like useLists.js does)
            print("  🏗️  Step 4: Building lists with items...")
            lists_with_items = []
            
            for list_item in lists_data:
                list_items = items_by_list_id.get(list_item['id'], [])
                
                # Sort in memory (like useLists.js does)
                sorted_items = sorted(list_items, key=lambda x: x['created_at'], reverse=True)
                
                # Separate items and stay-aways (like useLists.js does)
                optimized_items = [item for item in sorted_items if not item.get('is_stay_away')]
                optimized_stay_aways = [item for item in sorted_items if item.get('is_stay_away')]
                
                list_with_items = {
                    **list_item,
                    'items': optimized_items,
                    'stayAways': optimized_stay_aways
                }
                lists_with_items.append(list_with_items)
                
                print(f"    📋 List '{list_item['name']}': {len(optimized_items)} items, {len(optimized_stay_aways)} stay-aways")
            
            end_time = time.time()
            duration = end_time - start_time
            
            total_items = sum(len(list_item['items']) + len(list_item['stayAways']) for list_item in lists_with_items)
            
            print(f"✅ LISTS loading WITH image_url: {duration:.3f} seconds")
            print(f"   📊 Lists loaded: {len(lists_with_items)}")
            print(f"   📊 Total items: {total_items}")
            print(f"   📊 Total queries: 2 (lists + items)")
            return duration, len(lists_with_items)
            
        else:
            print("❌ No items found")
            return None, 0
            
    except Exception as e:
        print(f"❌ Error testing lists loading WITH image_url: {e}")
        return None, 0

def test_lists_loading_without_image_url():
    """Test lists loading WITHOUT image_url (useLists.js approach)"""
    print("🔄 Testing LISTS loading WITHOUT image_url (useLists.js approach)...")
    
    start_time = time.time()
    
    try:
        # Step 1: Get all lists for a user (like useLists.js does)
        print("  📋 Step 1: Fetching lists...")
        lists_response = supabase.table('lists').select('*').eq('user_id', TEST_USER_ID).order('created_at', desc=True).execute()
        
        if not lists_response.data:
            print("❌ No lists found for test user")
            return None, 0
        
        lists_data = lists_response.data
        print(f"  ✅ Found {len(lists_data)} lists")
        
        # Step 2: Single query to get all items for all lists (EXCLUDING image_url)
        print("  📦 Step 2: Single query for all items (WITHOUT image_url)...")
        list_ids = [list_item['id'] for list_item in lists_data]
        
        # Exclude image_url from the select
        items_response = supabase.table('items').select(
            'id, list_id, name, rating, notes, tags, is_stay_away, created_at, updated_at, ai_product_name, ai_brand, ai_category, ai_confidence, ai_description, ai_tags, ai_allergens, ai_lookup_status, user_product_name, user_description, user_tags, detailed_breakdown, rarity, place_name, location, latitude, longitude, price, currency_code, photo_date_time, photo_location_source, category, species, certainty'
        ).in_('list_id', list_ids).execute()
        
        if items_response.data:
            # Step 3: Group items by list_id in memory (like useLists.js does)
            print("  🔄 Step 3: Grouping items by list_id in memory...")
            items_by_list_id = {}
            
            for item in items_response.data:
                list_id = item['list_id']
                if list_id not in items_by_list_id:
                    items_by_list_id[list_id] = []
                items_by_list_id[list_id].append(item)
            
            # Step 4: Build lists with their items (like useLists.js does)
            print("  🏗️  Step 4: Building lists with items...")
            lists_with_items = []
            
            for list_item in lists_data:
                list_items = items_by_list_id.get(list_item['id'], [])
                
                # Sort in memory (like useLists.js does)
                sorted_items = sorted(list_items, key=lambda x: x['created_at'], reverse=True)
                
                # Separate items and stay-aways (like useLists.js does)
                optimized_items = [item for item in sorted_items if not item.get('is_stay_away')]
                optimized_stay_aways = [item for item in sorted_items if item.get('is_stay_away')]
                
                list_with_items = {
                    **list_item,
                    'items': optimized_items,
                    'stayAways': optimized_stay_aways
                }
                lists_with_items.append(list_with_items)
                
                print(f"    📋 List '{list_item['name']}': {len(optimized_items)} items, {len(optimized_stay_aways)} stay-aways")
            
            end_time = time.time()
            duration = end_time - start_time
            
            total_items = sum(len(list_item['items']) + len(list_item['stayAways']) for list_item in lists_with_items)
            
            print(f"✅ LISTS loading WITHOUT image_url: {duration:.3f} seconds")
            print(f"   📊 Lists loaded: {len(lists_with_items)}")
            print(f"   📊 Total items: {total_items}")
            print(f"   📊 Total queries: 2 (lists + items)")
            return duration, len(lists_with_items)
            
        else:
            print("❌ No items found")
            return None, 0
            
    except Exception as e:
        print(f"❌ Error testing lists loading WITHOUT image_url: {e}")
        return None, 0

def test_feed_loading_with_image_url():
    """Test feed loading WITH image_url (MainScreen.jsx approach)"""
    print("🔄 Testing FEED loading WITH image_url (MainScreen.jsx approach)...")
    
    start_time = time.time()
    
    try:
        # Step 1: Check if posts table exists (like getFeedPosts does)
        print("  📋 Step 1: Checking posts table...")
        test_query = supabase.table('posts').select('id').limit(1).execute()
        
        if test_query.error:
            print("❌ Posts table not accessible")
            return None, 0
        
        # Step 2: Get following users (like getFeedPosts does for 'following' feed)
        print("  👥 Step 2: Getting following users...")
        following_response = supabase.table('follows').select('following_id').eq('follower_id', TEST_USER_ID).execute()
        
        if following_response.error:
            print("❌ Error getting following users")
            return None, 0
        
        following_users = following_response.data or []
        if not following_users:
            print("❌ User is not following anyone")
            return None, 0
        
        following_user_ids = [f['following_id'] for f in following_users]
        print(f"  ✅ Found {len(following_user_ids)} users being followed")
        
        # Step 3: Get posts from following users (like getFeedPosts does)
        print("  📝 Step 3: Getting posts from following users...")
        posts_response = supabase.table('posts').select(
            'id, user_id, item_id, list_id, location, created_at'
        ).eq('is_public', True).in_('user_id', following_user_ids).order('created_at', desc=True).limit(5).execute()
        
        if not posts_response.data:
            print("❌ No posts found")
            return None, 0
        
        posts_data = posts_response.data
        print(f"  ✅ Found {len(posts_data)} posts")
        
        # Step 4: Enrich each post with related data (like getFeedPosts does)
        print("  🔄 Step 4: Enriching posts with related data...")
        enriched_posts = []
        total_queries = 0
        
        for post in posts_data:
            print(f"    📝 Enriching post {post['id']}...")
            
            # Get item data WITH image_url
            item_response = supabase.table('items').select('name, image_url, rating, notes, tags, is_stay_away').eq('id', post['item_id']).single().execute()
            total_queries += 1
            
            # Get list data
            list_response = supabase.table('lists').select('name').eq('id', post['list_id']).single().execute()
            total_queries += 1
            
            # Get user data
            user_response = supabase.table('users').select('email').eq('id', post['user_id']).single().execute()
            total_queries += 1
            
            # Get profile data
            profile_response = supabase.table('profiles').select('username, display_name, avatar_url').eq('id', post['user_id']).single().execute()
            total_queries += 1
            
            # Get like count
            like_count_response = supabase.table('likes').select('*', count='exact').eq('post_id', post['id']).execute()
            total_queries += 1
            
            # Get comment count
            comment_count_response = supabase.table('comments').select('*', count='exact').eq('post_id', post['id']).execute()
            total_queries += 1
            
            # Check if current user liked this post
            user_like_response = supabase.table('likes').select('id').eq('post_id', post['id']).eq('user_id', TEST_USER_ID).single().execute()
            total_queries += 1
            
            enriched_post = {
                **post,
                'users': user_response.data or {'email': 'Unknown'},
                'profiles': profile_response.data or {'username': 'Anonymous'},
                'items': item_response.data or {'name': 'Unknown Item', 'rating': 3},
                'lists': list_response.data or {'name': 'Unknown List'},
                'like_count': like_count_response.count or 0,
                'comment_count': comment_count_response.count or 0,
                'user_liked': bool(user_like_response.data)
            }
            enriched_posts.append(enriched_post)
            
            print(f"      ✅ Post enriched with {total_queries} queries")
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"✅ FEED loading WITH image_url: {duration:.3f} seconds")
        print(f"   📊 Posts loaded: {len(enriched_posts)}")
        print(f"   📊 Total queries: {total_queries}")
        print(f"   📊 Queries per post: {total_queries // len(enriched_posts) if enriched_posts else 0}")
        return duration, len(enriched_posts)
        
    except Exception as e:
        print(f"❌ Error testing feed loading WITH image_url: {e}")
        return None, 0

def test_feed_loading_without_image_url():
    """Test feed loading WITHOUT image_url (MainScreen.jsx approach)"""
    print("🔄 Testing FEED loading WITHOUT image_url (MainScreen.jsx approach)...")
    
    start_time = time.time()
    
    try:
        # Step 1: Check if posts table exists (like getFeedPosts does)
        print("  📋 Step 1: Checking posts table...")
        test_query = supabase.table('posts').select('id').limit(1).execute()
        
        if test_query.error:
            print("❌ Posts table not accessible")
            return None, 0
        
        # Step 2: Get following users (like getFeedPosts does for 'following' feed)
        print("  👥 Step 2: Getting following users...")
        following_response = supabase.table('follows').select('following_id').eq('follower_id', TEST_USER_ID).execute()
        
        if following_response.error:
            print("❌ Error getting following users")
            return None, 0
        
        following_users = following_response.data or []
        if not following_users:
            print("❌ User is not following anyone")
            return None, 0
        
        following_user_ids = [f['following_id'] for f in following_users]
        print(f"  ✅ Found {len(following_user_ids)} users being followed")
        
        # Step 3: Get posts from following users (like getFeedPosts does)
        print("  📝 Step 3: Getting posts from following users...")
        posts_response = supabase.table('posts').select(
            'id, user_id, item_id, list_id, location, created_at'
        ).eq('is_public', True).in_('user_id', following_user_ids).order('created_at', desc=True).limit(5).execute()
        
        if not posts_response.data:
            print("❌ No posts found")
            return None, 0
        
        posts_data = posts_response.data
        print(f"  ✅ Found {len(posts_data)} posts")
        
        # Step 4: Enrich each post with related data (EXCLUDING image_url)
        print("  🔄 Step 4: Enriching posts with related data (WITHOUT image_url)...")
        enriched_posts = []
        total_queries = 0
        
        for post in posts_data:
            print(f"    📝 Enriching post {post['id']}...")
            
            # Get item data WITHOUT image_url
            item_response = supabase.table('items').select('name, rating, notes, tags, is_stay_away').eq('id', post['item_id']).single().execute()
            total_queries += 1
            
            # Get list data
            list_response = supabase.table('lists').select('name').eq('id', post['list_id']).single().execute()
            total_queries += 1
            
            # Get user data
            user_response = supabase.table('users').select('email').eq('id', post['user_id']).single().execute()
            total_queries += 1
            
            # Get profile data
            profile_response = supabase.table('profiles').select('username, display_name, avatar_url').eq('id', post['user_id']).single().execute()
            total_queries += 1
            
            # Get like count
            like_count_response = supabase.table('likes').select('*', count='exact').eq('post_id', post['id']).execute()
            total_queries += 1
            
            # Get comment count
            comment_count_response = supabase.table('comments').select('*', count='exact').eq('post_id', post['id']).execute()
            total_queries += 1
            
            # Check if current user liked this post
            user_like_response = supabase.table('likes').select('id').eq('post_id', post['id']).eq('user_id', TEST_USER_ID).single().execute()
            total_queries += 1
            
            enriched_post = {
                **post,
                'users': user_response.data or {'email': 'Unknown'},
                'profiles': profile_response.data or {'username': 'Anonymous'},
                'items': item_response.data or {'name': 'Unknown Item', 'rating': 3},
                'lists': list_response.data or {'name': 'Unknown List'},
                'like_count': like_count_response.count or 0,
                'comment_count': comment_count_response.count or 0,
                'user_liked': bool(user_like_response.data)
            }
            enriched_posts.append(enriched_post)
            
            print(f"      ✅ Post enriched with {total_queries} queries")
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"✅ FEED loading WITHOUT image_url: {duration:.3f} seconds")
        print(f"   📊 Posts loaded: {len(enriched_posts)}")
        print(f"   📊 Total queries: {total_queries}")
        print(f"   📊 Queries per post: {total_queries // len(enriched_posts) if enriched_posts else 0}")
        return duration, len(enriched_posts)
        
    except Exception as e:
        print(f"❌ Error testing feed loading WITHOUT image_url: {e}")
        return None, 0

def run_comprehensive_performance_test(iterations=3):
    """Run comprehensive performance test for both lists and feed loading"""
    print(f"🚀 Starting Comprehensive Performance Test ({iterations} iterations)")
    print("Testing BOTH lists loading (useLists.js) and feed loading (MainScreen.jsx)")
    print("=" * 70)
    
    lists_with_image_times = []
    lists_without_image_times = []
    feed_with_image_times = []
    feed_without_image_times = []
    
    for i in range(iterations):
        print(f"\n📊 Iteration {i + 1}/{iterations}")
        print("-" * 50)
        
        # Test lists loading WITH image_url
        duration, count = test_lists_loading_with_image_url()
        if duration is not None:
            lists_with_image_times.append(duration)
        
        time.sleep(1)
        
        # Test lists loading WITHOUT image_url
        duration, count = test_lists_loading_without_image_url()
        if duration is not None:
            lists_without_image_times.append(duration)
        
        time.sleep(1)
        
        # Test feed loading WITH image_url
        duration, count = test_feed_loading_with_image_url()
        if duration is not None:
            feed_with_image_times.append(duration)
        
        time.sleep(1)
        
        # Test feed loading WITHOUT image_url
        duration, count = test_feed_loading_without_image_url()
        if duration is not None:
            feed_without_image_times.append(duration)
        
        time.sleep(2)
    
    # Calculate statistics
    print("\n" + "=" * 70)
    print("📈 COMPREHENSIVE PERFORMANCE RESULTS")
    print("=" * 70)
    
    if lists_with_image_times:
        print(f"✅ LISTS loading WITH image_url:")
        print(f"   Average: {statistics.mean(lists_with_image_times):.3f}s")
        print(f"   Median: {statistics.median(lists_with_image_times):.3f}s")
        print(f"   Min: {min(lists_with_image_times):.3f}s")
        print(f"   Max: {max(lists_with_image_times):.3f}s")
        if len(lists_with_image_times) > 1:
            print(f"   Std Dev: {statistics.stdev(lists_with_image_times):.3f}s")
    
    if lists_without_image_times:
        print(f"\n✅ LISTS loading WITHOUT image_url:")
        print(f"   Average: {statistics.mean(lists_without_image_times):.3f}s")
        print(f"   Median: {statistics.median(lists_without_image_times):.3f}s")
        print(f"   Min: {min(lists_without_image_times):.3f}s")
        print(f"   Max: {max(lists_without_image_times):.3f}s")
        if len(lists_without_image_times) > 1:
            print(f"   Std Dev: {statistics.stdev(lists_without_image_times):.3f}s")
    
    if feed_with_image_times:
        print(f"\n✅ FEED loading WITH image_url:")
        print(f"   Average: {statistics.mean(feed_with_image_times):.3f}s")
        print(f"   Median: {statistics.median(feed_with_image_times):.3f}s")
        print(f"   Min: {min(feed_with_image_times):.3f}s")
        print(f"   Max: {max(feed_with_image_times):.3f}s")
        if len(feed_with_image_times) > 1:
            print(f"   Std Dev: {statistics.stdev(feed_with_image_times):.3f}s")
    
    if feed_without_image_times:
        print(f"\n✅ FEED loading WITHOUT image_url:")
        print(f"   Average: {statistics.mean(feed_without_image_times):.3f}s")
        print(f"   Median: {statistics.median(feed_without_image_times):.3f}s")
        print(f"   Min: {min(feed_without_image_times):.3f}s")
        print(f"   Max: {max(feed_without_image_times):.3f}s")
        if len(feed_without_image_times) > 1:
            print(f"   Std Dev: {statistics.stdev(feed_without_image_times):.3f}s")
    
    # Calculate improvements
    if lists_with_image_times and lists_without_image_times:
        avg_lists_with = statistics.mean(lists_with_image_times)
        avg_lists_without = statistics.mean(lists_without_image_times)
        lists_improvement = ((avg_lists_with - avg_lists_without) / avg_lists_with) * 100
        
        print(f"\n📊 LISTS LOADING ANALYSIS:")
        print(f"   Speed improvement: {lists_improvement:.1f}%")
        print(f"   Time saved: {avg_lists_with - avg_lists_without:.3f}s per query")
    
    if feed_with_image_times and feed_without_image_times:
        avg_feed_with = statistics.mean(feed_with_image_times)
        avg_feed_without = statistics.mean(feed_without_image_times)
        feed_improvement = ((avg_feed_with - avg_feed_without) / avg_feed_with) * 100
        
        print(f"\n📊 FEED LOADING ANALYSIS:")
        print(f"   Speed improvement: {feed_improvement:.1f}%")
        print(f"   Time saved: {avg_feed_with - avg_feed_without:.3f}s per query")
    
    if lists_with_image_times and feed_with_image_times:
        avg_lists = statistics.mean(lists_with_image_times)
        avg_feed = statistics.mean(feed_with_image_times)
        
        print(f"\n🚀 COMPARISON ANALYSIS:")
        print(f"   Lists vs Feed loading time: {avg_lists:.3f}s vs {avg_feed:.3f}s")
        print(f"   Feed is {avg_feed/avg_lists:.1f}x slower than Lists loading")
        print(f"   Lists uses 2 queries, Feed uses ~35 queries (7 per post)")

def main():
    """Main function"""
    print("🔧 Comprehensive Supabase Performance Test")
    print("Testing BOTH lists loading (useLists.js) and feed loading (MainScreen.jsx)")
    print(f"🔗 Supabase URL: {SUPABASE_URL}")
    print(f"🔑 Using anon key: {SUPABASE_ANON_KEY[:10]}...")
    print(f"👤 Test user ID: {TEST_USER_ID}")
    print("\n📋 This test replicates:")
    print("   LISTS loading (useLists.js):")
    print("   1. Fetch all lists for a user")
    print("   2. Single query to get all items for all lists")
    print("   3. Group items by list_id in memory")
    print("   4. Build lists with their items")
    print("   5. Separate items and stay-aways")
    print("\n   FEED loading (MainScreen.jsx):")
    print("   1. Check posts table exists")
    print("   2. Get following users")
    print("   3. Get posts from following users")
    print("   4. For each post: 7 individual queries to enrich data")
    print("   5. Combine all data into enriched posts")
    
    print(f"\n⚠️  IMPORTANT: Replace TEST_USER_ID with a real user ID from your database!")
    
    # Run the comprehensive performance test
    run_comprehensive_performance_test(iterations=3)
    
    print("\n✅ Comprehensive performance test completed!")

if __name__ == "__main__":
    main() 