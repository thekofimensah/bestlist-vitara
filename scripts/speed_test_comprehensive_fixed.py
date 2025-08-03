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
TEST_USER_ID = "8310e8a7-0964-4597-8bcc-8a77266cbae6"  # Replace with actual user ID

def analyze_image_urls(data):
    """Analyze image URLs in data to understand their size impact"""
    if not data:
        return 0, 0, 0
    
    image_urls = []
    total_url_length = 0
    
    def extract_image_urls(obj):
        nonlocal total_url_length
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == 'image_url' and value:
                    image_urls.append(value)
                    total_url_length += len(value)
                elif isinstance(value, (dict, list)):
                    extract_image_urls(value)
        elif isinstance(obj, list):
            for item in obj:
                extract_image_urls(item)
    
    extract_image_urls(data)
    
    avg_url_length = total_url_length / len(image_urls) if image_urls else 0
    return len(image_urls), total_url_length, avg_url_length

def safe_execute_query(query_func, error_message):
    """Safely execute a Supabase query with proper error handling and data size tracking"""
    try:
        result = query_func()
        
        # Debug: Print the result structure
        print(f"🔍 Debug: Result type: {type(result)}")
    
        
        # Check if result has error attribute and it's not None
        if hasattr(result, 'error') and result.error is not None:
            print(f"❌ {error_message}: {result.error}")
            return None
        
        # Calculate data size if we have data
        data_size = 0
        image_analysis = None
        if hasattr(result, 'data') and result.data:
            import json
            data_size = len(json.dumps(result.data))
            
            # Analyze image URLs if present
            image_count, total_url_length, avg_url_length = analyze_image_urls(result.data)
            if image_count > 0:
                image_analysis = {
                    'count': image_count,
                    'total_length': total_url_length,
                    'avg_length': avg_url_length,
                    'urls_percent': (total_url_length / data_size) * 100 if data_size > 0 else 0
                }
        
        # Create a wrapper object with size info
        class ResultWrapper:
            def __init__(self, original_result, data_size, image_analysis):
                self.data = original_result.data
                self.error = getattr(original_result, 'error', None)
                self.data_size_bytes = data_size
                self.data_size_mb = data_size / (1024 * 1024)
                self.image_analysis = image_analysis
        
        return ResultWrapper(result, data_size, image_analysis)
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
            return None, 0, 0
        
        lists_data = lists_response.data
        print(f"  ✅ Found {len(lists_data)} lists")
        
        # Step 2: Single query to get all items for all lists (OPTIMIZED approach from useLists.js)
        print("  📦 Step 2: Single query for all items (WITH image_url)...")
        list_ids = [list_item['id'] for list_item in lists_data]
        
        items_response = safe_execute_query(
            lambda: supabase.table('items').select('*').in_('list_id', list_ids).limit(6).execute(),
            "Error fetching items"
        )
        
        if not items_response or not items_response.data:
            print("❌ No items found")
            return None, 0, 0
        
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
        
        # Calculate total data size
        total_data_size_bytes = 0
        total_data_size_mb = 0
        
        # Get data size from lists query
        if lists_response and hasattr(lists_response, 'data_size_bytes'):
            total_data_size_bytes += lists_response.data_size_bytes
            total_data_size_mb += lists_response.data_size_mb
        
        # Get data size from items query
        if items_response and hasattr(items_response, 'data_size_bytes'):
            total_data_size_bytes += items_response.data_size_bytes
            total_data_size_mb += items_response.data_size_mb
        
        print(f"✅ LISTS loading WITH image_url: {duration:.3f} seconds")
        print(f"   📊 Lists loaded: {len(lists_with_items)}")
        print(f"   📊 Total items: {total_items}")
        print(f"   📊 Total queries: 2 (lists + items)")
        print(f"   📊 Data transferred: {total_data_size_mb:.2f} MB ({total_data_size_bytes:,} bytes)")
        
        # Show image analysis if available
        if items_response and hasattr(items_response, 'image_analysis') and items_response.image_analysis:
            img_analysis = items_response.image_analysis
            print(f"   🖼️  Image URLs: {img_analysis['count']} images")
            print(f"   🖼️  Image URLs size: {img_analysis['total_length']:,} bytes ({img_analysis['urls_percent']:.1f}% of total)")
            print(f"   🖼️  Avg URL length: {img_analysis['avg_length']:.0f} characters")
        
        return duration, len(lists_with_items), total_data_size_mb
        
    except Exception as e:
        print(f"❌ Error testing lists loading WITH image_url: {e}")
        return None, 0, 0

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
            return None, 0, 0
        
        lists_data = lists_response.data
        print(f"  ✅ Found {len(lists_data)} lists")
        
        # Step 2: Single query to get all items for all lists (EXCLUDING image_url)
        print("  📦 Step 2: Single query for all items (WITHOUT image_url)...")
        list_ids = [list_item['id'] for list_item in lists_data]
        
        # Exclude image_url from the select
        items_response = safe_execute_query(
            lambda: supabase.table('items').select(
                'id, list_id, name, rating, notes, tags, is_stay_away, created_at, updated_at, ai_product_name, ai_brand, ai_category, ai_confidence, ai_description, ai_tags, ai_allergens, ai_lookup_status, user_product_name, user_description, user_tags, detailed_breakdown, rarity, place_name, location, latitude, longitude, price, currency_code, photo_date_time, photo_location_source, category, species, certainty'
            ).in_('list_id', list_ids).limit(6).execute(),
            "Error fetching items"
        )
        
        if not items_response or not items_response.data:
            print("❌ No items found")
            return None, 0, 0
        
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
        
        # Calculate total data size
        total_data_size_bytes = 0
        total_data_size_mb = 0
        
        # Get data size from lists query
        if lists_response and hasattr(lists_response, 'data_size_bytes'):
            total_data_size_bytes += lists_response.data_size_bytes
            total_data_size_mb += lists_response.data_size_mb
        
        # Get data size from items query
        if items_response and hasattr(items_response, 'data_size_bytes'):
            total_data_size_bytes += items_response.data_size_bytes
            total_data_size_mb += items_response.data_size_mb
        
        print(f"✅ LISTS loading WITHOUT image_url: {duration:.3f} seconds")
        print(f"   📊 Lists loaded: {len(lists_with_items)}")
        print(f"   📊 Total items: {total_items}")
        print(f"   📊 Total queries: 2 (lists + items)")
        print(f"   📊 Data transferred: {total_data_size_mb:.2f} MB ({total_data_size_bytes:,} bytes)")
        
        return duration, len(lists_with_items), total_data_size_mb
        
    except Exception as e:
        print(f"❌ Error testing lists loading WITHOUT image_url: {e}")
        return None, 0, 0

def run_comprehensive_performance_test(iterations=3):
    """Run comprehensive performance test for both lists and feed loading"""
    print(f"🚀 Starting Comprehensive Performance Test ({iterations} iterations)")
    print("Testing BOTH lists loading (useLists.js) and feed loading (MainScreen.jsx)")
    print("=" * 70)
    
    lists_with_image_times = []
    lists_without_image_times = []
    
    lists_with_image_sizes = []
    lists_without_image_sizes = []
    
    for i in range(iterations):
        print(f"\n📊 Iteration {i + 1}/{iterations}")
        print("-" * 50)
        
        # Test lists loading WITH image_url
        duration, count, data_size = test_lists_loading_with_image_url()
        if duration is not None:
            lists_with_image_times.append(duration)
            lists_with_image_sizes.append(data_size)
        
        time.sleep(1)
        
        # Test lists loading WITHOUT image_url
        duration, count, data_size = test_lists_loading_without_image_url()
        if duration is not None:
            lists_without_image_times.append(duration)
            lists_without_image_sizes.append(data_size)
        
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
        
        if lists_with_image_sizes:
            print(f"   📊 Data size: {statistics.mean(lists_with_image_sizes):.2f} MB average")
            print(f"   📊 Data range: {min(lists_with_image_sizes):.2f} - {max(lists_with_image_sizes):.2f} MB")
    
    if lists_without_image_times:
        print(f"\n✅ LISTS loading WITHOUT image_url:")
        print(f"   Average: {statistics.mean(lists_without_image_times):.3f}s")
        print(f"   Median: {statistics.median(lists_without_image_times):.3f}s")
        print(f"   Min: {min(lists_without_image_times):.3f}s")
        print(f"   Max: {max(lists_without_image_times):.3f}s")
        if len(lists_without_image_times) > 1:
            print(f"   Std Dev: {statistics.stdev(lists_without_image_times):.3f}s")
        
        if lists_without_image_sizes:
            print(f"   📊 Data size: {statistics.mean(lists_without_image_sizes):.2f} MB average")
            print(f"   📊 Data range: {min(lists_without_image_sizes):.2f} - {max(lists_without_image_sizes):.2f} MB")
    
    # Calculate improvements
    if lists_with_image_times and lists_without_image_times:
        avg_lists_with = statistics.mean(lists_with_image_times)
        avg_lists_without = statistics.mean(lists_without_image_times)
        lists_improvement = ((avg_lists_with - avg_lists_without) / avg_lists_with) * 100
        
        print(f"\n📊 LISTS LOADING ANALYSIS:")
        print(f"   Speed improvement: {lists_improvement:.1f}%")
        print(f"   Time saved: {avg_lists_with - avg_lists_without:.3f}s per query")
        
        # Data size analysis
        if lists_with_image_sizes and lists_without_image_sizes:
            avg_size_with = statistics.mean(lists_with_image_sizes)
            avg_size_without = statistics.mean(lists_without_image_sizes)
            size_difference = avg_size_with - avg_size_without
            size_ratio = avg_size_with / avg_size_without if avg_size_without > 0 else 1
            
            print(f"   📊 Data size difference: {size_difference:.2f} MB ({size_ratio:.1f}x larger)")
            print(f"   📊 With images: {avg_size_with:.2f} MB")
            print(f"   📊 Without images: {avg_size_without:.2f} MB")
    
 
    # Add recommendations based on results
    print(f"\n🎯 RECOMMENDATIONS:")
    print("=" * 50)
    
    # Data size recommendations
   
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
    print("   6. Compare WITH vs WITHOUT image_url")
    
    print(f"\n⚠️  IMPORTANT: Replace TEST_USER_ID with a real user ID from your database!")
    
    # Run the comprehensive performance test
    run_comprehensive_performance_test(iterations=3)
    
    print("\n✅ Comprehensive performance test completed!")

if __name__ == "__main__":
    main() 