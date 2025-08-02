#!/usr/bin/env python3
"""
Comprehensive Speed Test Script for Supabase (FIXED VERSION)
Tests BOTH lists loading (useLists.js) and feed loading (MainScreen.jsx) processes
Replicates the exact approach used in both systems
"""

import os
import time
import statistics
import subprocess
import json
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

def run_javascript_test():
    """Run JavaScript Supabase client tests"""
    print("\n🟨 Testing JavaScript Supabase Client...")
    
    # Create a temporary JavaScript test file
    js_test_code = f'''
import {{ createClient }} from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_USER_ID = "{TEST_USER_ID}";

console.log('🔧 JavaScript Supabase config check:');
console.log('  - URL exists:', !!supabaseUrl);
console.log('  - Key exists:', !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testJavaScriptSupabase() {{
    const results = {{}};
    
    try {{
        // Test 1: Simple query
        console.log('🔄 JavaScript Test 1: Simple query...');
        const start1 = Date.now();
        const {{ data: simpleData, error: simpleError }} = await supabase
            .from('lists')
            .select('count')
            .limit(1);
        const duration1 = Date.now() - start1;
        
        results.simple = {{
            duration: duration1,
            success: !simpleError,
            error: simpleError?.message || null
        }};
        console.log('✅ JavaScript Test 1 result:', results.simple);
        
        // Test 2: Lists query
        console.log('🔄 JavaScript Test 2: Lists query...');
        const start2 = Date.now();
        const {{ data: listsData, error: listsError }} = await supabase
            .from('lists')
            .select('*')
            .eq('user_id', TEST_USER_ID)
            .order('created_at', {{ ascending: false }});
        const duration2 = Date.now() - start2;
        
        results.lists = {{
            duration: duration2,
            success: !listsError,
            error: listsError?.message || null,
            count: listsData?.length || 0
        }};
        console.log('✅ JavaScript Test 2 result:', results.lists);
        
        // Test 3: Items query (if lists exist)
        if (listsData && listsData.length > 0) {{
            console.log('🔄 JavaScript Test 3: Items query...');
            const start3 = Date.now();
            const listIds = listsData.map(l => l.id);
            const {{ data: itemsData, error: itemsError }} = await supabase
                .from('items')
                .select('*')
                .in('list_id', listIds);
            const duration3 = Date.now() - start3;
            
            results.items = {{
                duration: duration3,
                success: !itemsError,
                error: itemsError?.message || null,
                count: itemsData?.length || 0
            }};
            console.log('✅ JavaScript Test 3 result:', results.items);
        }}
        
        // Test 4: JOIN query (the problematic one)
        console.log('🔄 JavaScript Test 4: JOIN query...');
        const start4 = Date.now();
        const {{ data: joinData, error: joinError }} = await supabase
            .from('lists')
            .select(`
                id,
                name,
                color,
                created_at,
                items (
                    id,
                    name,
                    image_url,
                    rating,
                    is_stay_away,
                    created_at,
                    notes
                )
            `)
            .eq('user_id', TEST_USER_ID)
            .order('created_at', {{ ascending: false }})
            .order('created_at', {{ referencedTable: 'items', ascending: false }});
        const duration4 = Date.now() - start4;
        
        results.join = {{
            duration: duration4,
            success: !joinError,
            error: joinError?.message || null,
            count: joinData?.length || 0
        }};
        console.log('✅ JavaScript Test 4 result:', results.join);
        
    }} catch (error) {{
        console.error('❌ JavaScript test error:', error.message);
        results.error = error.message;
    }}
    
    console.log('📊 JavaScript Results Summary:', JSON.stringify(results, null, 2));
    return results;
}}

testJavaScriptSupabase();
'''
    
    # Write the JavaScript test file
    with open('temp_js_test.js', 'w') as f:
        f.write(js_test_code)
    
    try:
        # Run the JavaScript test
        print("🟨 Running JavaScript Supabase client tests...")
        result = subprocess.run(['node', 'temp_js_test.js'], 
                              capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print("✅ JavaScript tests completed successfully")
            print(result.stdout)
        else:
            print("❌ JavaScript tests failed:")
            print(result.stderr)
            
    except subprocess.TimeoutExpired:
        print("❌ JavaScript tests timed out after 120 seconds")
    except Exception as e:
        print(f"❌ Error running JavaScript tests: {e}")
    finally:
        # Clean up
        if os.path.exists('temp_js_test.js'):
            os.remove('temp_js_test.js')

def safe_execute_query(query_func, error_message):
    """Safely execute a Supabase query with proper error handling"""
    try:
        result = query_func()
        # Check if result has error attribute and it's not None
        if hasattr(result, 'error') and result.error is not None:
            print(f"❌ {error_message}: {result.error}")
            return None
        return result
    except Exception as e:
        print(f"❌ {error_message}: {str(e)}")
        return None

def test_lists_loading_with_image_url():
    """Test lists loading WITH image_url (useLists.js approach)"""
    print("🔄 Testing LISTS loading WITH image_url (useLists.js approach)...")
    
    start_time = time.time()
    
    try:
        # Step 1: Get all lists for a user (like useLists.js does)
        print("  📋 Step 1: Fetching lists...")
        lists_response = safe_execute_query(
            lambda: supabase.table('lists').select('*').eq('user_id', TEST_USER_ID).order('created_at', desc=True).execute(),
            "Error fetching lists"
        )
        
        if not lists_response or not lists_response.data:
            print("❌ No lists found for test user")
            return None, 0
        
        lists_data = lists_response.data
        print(f"  ✅ Found {len(lists_data)} lists")
        
        # Step 2: Single query to get all items for all lists (OPTIMIZED approach from useLists.js)
        print("  📦 Step 2: Single query for all items (WITH image_url)...")
        list_ids = [list_item['id'] for list_item in lists_data]
        
        items_response = safe_execute_query(
            lambda: supabase.table('items').select('*').in_('list_id', list_ids).execute(),
            "Error fetching items"
        )
        
        if not items_response or not items_response.data:
            print("❌ No items found")
            return None, 0
        
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
        lists_response = safe_execute_query(
            lambda: supabase.table('lists').select('*').eq('user_id', TEST_USER_ID).order('created_at', desc=True).execute(),
            "Error fetching lists"
        )
        
        if not lists_response or not lists_response.data:
            print("❌ No lists found for test user")
            return None, 0
        
        lists_data = lists_response.data
        print(f"  ✅ Found {len(lists_data)} lists")
        
        # Step 2: Single query to get all items for all lists (EXCLUDING image_url)
        print("  📦 Step 2: Single query for all items (WITHOUT image_url)...")
        list_ids = [list_item['id'] for list_item in lists_data]
        
        # Exclude image_url from the select
        items_response = safe_execute_query(
            lambda: supabase.table('items').select(
                'id, list_id, name, rating, notes, tags, is_stay_away, created_at, updated_at, ai_product_name, ai_brand, ai_category, ai_confidence, ai_description, ai_tags, ai_allergens, ai_lookup_status, user_product_name, user_description, user_tags, detailed_breakdown, rarity, place_name, location, latitude, longitude, price, currency_code, photo_date_time, photo_location_source, category, species, certainty'
            ).in_('list_id', list_ids).execute(),
            "Error fetching items"
        )
        
        if not items_response or not items_response.data:
            print("❌ No items found")
            return None, 0
        
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
        test_query = safe_execute_query(
            lambda: supabase.table('posts').select('id').limit(1).execute(),
            "Posts table not accessible"
        )
        
        if not test_query:
            print("❌ Posts table not accessible")
            return None, 0
        
        # Step 2: Get following users (like getFeedPosts does for 'following' feed)
        print("  👥 Step 2: Getting following users...")
        following_response = safe_execute_query(
            lambda: supabase.table('follows').select('following_id').eq('follower_id', TEST_USER_ID).execute(),
            "Error getting following users"
        )
        
        if not following_response:
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
        posts_response = safe_execute_query(
            lambda: supabase.table('posts').select(
                'id, user_id, item_id, list_id, location, created_at'
            ).eq('is_public', True).in_('user_id', following_user_ids).order('created_at', desc=True).limit(5).execute(),
            "Error getting posts"
        )
        
        if not posts_response or not posts_response.data:
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
            item_response = safe_execute_query(
                lambda: supabase.table('items').select('name, image_url, rating, notes, tags, is_stay_away').eq('id', post['item_id']).single().execute(),
                f"Error fetching item {post['item_id']}"
            )
            total_queries += 1
            
            # Get list data
            list_response = safe_execute_query(
                lambda: supabase.table('lists').select('name').eq('id', post['list_id']).single().execute(),
                f"Error fetching list {post['list_id']}"
            )
            total_queries += 1
            
            # Get user data
            user_response = safe_execute_query(
                lambda: supabase.table('users').select('email').eq('id', post['user_id']).single().execute(),
                f"Error fetching user {post['user_id']}"
            )
            total_queries += 1
            
            # Get profile data
            profile_response = safe_execute_query(
                lambda: supabase.table('profiles').select('username, display_name, avatar_url').eq('id', post['user_id']).single().execute(),
                f"Error fetching profile {post['user_id']}"
            )
            total_queries += 1
            
            # Get like count
            like_count_response = safe_execute_query(
                lambda: supabase.table('likes').select('*', count='exact').eq('post_id', post['id']).execute(),
                f"Error fetching likes for post {post['id']}"
            )
            total_queries += 1
            
            # Get comment count
            comment_count_response = safe_execute_query(
                lambda: supabase.table('comments').select('*', count='exact').eq('post_id', post['id']).execute(),
                f"Error fetching comments for post {post['id']}"
            )
            total_queries += 1
            
            # Check if current user liked this post
            user_like_response = safe_execute_query(
                lambda: supabase.table('likes').select('id').eq('post_id', post['id']).eq('user_id', TEST_USER_ID).single().execute(),
                f"Error checking user like for post {post['id']}"
            )
            total_queries += 1
            
            enriched_post = {
                **post,
                'users': user_response.data if user_response else {'email': 'Unknown'},
                'profiles': profile_response.data if profile_response else {'username': 'Anonymous'},
                'items': item_response.data if item_response else {'name': 'Unknown Item', 'rating': 3},
                'lists': list_response.data if list_response else {'name': 'Unknown List'},
                'like_count': like_count_response.count if like_count_response else 0,
                'comment_count': comment_count_response.count if comment_count_response else 0,
                'user_liked': bool(user_like_response.data if user_like_response else None)
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
        test_query = safe_execute_query(
            lambda: supabase.table('posts').select('id').limit(1).execute(),
            "Posts table not accessible"
        )
        
        if not test_query:
            print("❌ Posts table not accessible")
            return None, 0
        
        # Step 2: Get following users (like getFeedPosts does for 'following' feed)
        print("  👥 Step 2: Getting following users...")
        following_response = safe_execute_query(
            lambda: supabase.table('follows').select('following_id').eq('follower_id', TEST_USER_ID).execute(),
            "Error getting following users"
        )
        
        if not following_response:
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
        posts_response = safe_execute_query(
            lambda: supabase.table('posts').select(
                'id, user_id, item_id, list_id, location, created_at'
            ).eq('is_public', True).in_('user_id', following_user_ids).order('created_at', desc=True).limit(5).execute(),
            "Error getting posts"
        )
        
        if not posts_response or not posts_response.data:
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
            item_response = safe_execute_query(
                lambda: supabase.table('items').select('name, rating, notes, tags, is_stay_away').eq('id', post['item_id']).single().execute(),
                f"Error fetching item {post['item_id']}"
            )
            total_queries += 1
            
            # Get list data
            list_response = safe_execute_query(
                lambda: supabase.table('lists').select('name').eq('id', post['list_id']).single().execute(),
                f"Error fetching list {post['list_id']}"
            )
            total_queries += 1
            
            # Get user data
            user_response = safe_execute_query(
                lambda: supabase.table('users').select('email').eq('id', post['user_id']).single().execute(),
                f"Error fetching user {post['user_id']}"
            )
            total_queries += 1
            
            # Get profile data
            profile_response = safe_execute_query(
                lambda: supabase.table('profiles').select('username, display_name, avatar_url').eq('id', post['user_id']).single().execute(),
                f"Error fetching profile {post['user_id']}"
            )
            total_queries += 1
            
            # Get like count
            like_count_response = safe_execute_query(
                lambda: supabase.table('likes').select('*', count='exact').eq('post_id', post['id']).execute(),
                f"Error fetching likes for post {post['id']}"
            )
            total_queries += 1
            
            # Get comment count
            comment_count_response = safe_execute_query(
                lambda: supabase.table('comments').select('*', count='exact').eq('post_id', post['id']).execute(),
                f"Error fetching comments for post {post['id']}"
            )
            total_queries += 1
            
            # Check if current user liked this post
            user_like_response = safe_execute_query(
                lambda: supabase.table('likes').select('id').eq('post_id', post['id']).eq('user_id', TEST_USER_ID).single().execute(),
                f"Error checking user like for post {post['id']}"
            )
            total_queries += 1
            
            enriched_post = {
                **post,
                'users': user_response.data if user_response else {'email': 'Unknown'},
                'profiles': profile_response.data if profile_response else {'username': 'Anonymous'},
                'items': item_response.data if item_response else {'name': 'Unknown Item', 'rating': 3},
                'lists': list_response.data if list_response else {'name': 'Unknown List'},
                'like_count': like_count_response.count if like_count_response else 0,
                'comment_count': comment_count_response.count if comment_count_response else 0,
                'user_liked': bool(user_like_response.data if user_like_response else None)
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
    
    # Run JavaScript tests first
    run_javascript_test()
    
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
    print("🔧 Comprehensive Supabase Performance Test (FIXED VERSION)")
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