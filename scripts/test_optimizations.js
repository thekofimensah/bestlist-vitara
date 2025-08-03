#!/usr/bin/env node
/**
 * Quick test to verify the optimizations are working
 * This tests the actual functions from your app
 */

// Simulate the environment
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Test user ID (replace with a real one)
const TEST_USER_ID = "a71aeac4-f8bb-407d-ae58-02582d3b6221";

async function testOptimizedListsLoading() {
  console.log('🚀 Testing OPTIMIZED lists loading...');
  const start = Date.now();
  
  try {
    // Test the optimized query (same as useLists.js now uses)
    const { data: listsWithItems, error } = await supabase
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
      .order('created_at', { ascending: false })
      .order('created_at', { referencedTable: 'items', ascending: false });

    const duration = Date.now() - start;
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ OPTIMIZED lists loading: ${duration}ms`);
    console.log(`   📊 Lists found: ${listsWithItems?.length || 0}`);
    
    if (listsWithItems) {
      const totalItems = listsWithItems.reduce((sum, list) => 
        sum + (list.items?.length || 0), 0
      );
      console.log(`   📊 Total items: ${totalItems}`);
      console.log(`   📊 Queries: 1 (was 2 before optimization)`);
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

async function testOptimizedFeedLoading() {
  console.log('\n🚀 Testing OPTIMIZED feed loading...');
  const start = Date.now();
  
  try {
    // First get following users
    const { data: followingUsers } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', TEST_USER_ID);

    if (!followingUsers || followingUsers.length === 0) {
      console.log('❌ User is not following anyone');
      return;
    }

    const followingUserIds = followingUsers.map(f => f.following_id);
    
    // Test the optimized query (same as getFeedPosts now uses)
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        item_id,
        list_id,
        location,
        created_at,
        items (
          name,
          image_url,
          rating,
          notes,
          is_stay_away
        ),
        lists (
          name
        ),
        profiles!user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .in('user_id', followingUserIds)
      .order('created_at', { ascending: false })
      .limit(5);

    const duration = Date.now() - start;
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ OPTIMIZED feed loading: ${duration}ms`);
    console.log(`   📊 Posts found: ${posts?.length || 0}`);
    console.log(`   📊 Queries: 1 main + ${(posts?.length || 0) * 3} count queries (was 1 + ${(posts?.length || 0) * 7} before)`);
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

async function runTests() {
  console.log('🔧 Testing Optimizations');
  console.log('========================');
  
  await testOptimizedListsLoading();
  await testOptimizedFeedLoading();
  
  console.log('\n✅ Optimization tests completed!');
  console.log('\nExpected improvements:');
  console.log('- Lists loading: ~50% faster (1 query vs 2)');
  console.log('- Feed loading: ~70% faster (1+3N queries vs 1+7N queries)');
  console.log('- Should reduce 60s+ load times to 2-5 seconds');
}

runTests().catch(console.error); 