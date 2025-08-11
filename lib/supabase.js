import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom storage implementation using Capacitor Preferences for optimal mobile performance
class CapacitorStorage {
  constructor() {
    this.cache = new Map(); // In-memory cache for frequently accessed items
  }

  async getItem(key) {
    try {
      // Check cache first for immediate response
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }
      
      const { value } = await Preferences.get({ key });
      
      // Cache the result for next time
      if (value !== null) {
        this.cache.set(key, value);
      }
      
      return value;
    } catch (error) {
      console.warn('Failed to get item from storage:', error);
      return null;
    }
  }

  async setItem(key, value) {
    try {
      // Update cache immediately
      this.cache.set(key, value);
      
      // Save to persistent storage asynchronously
      await Preferences.set({ key, value });
    } catch (error) {
      console.warn('Failed to set item in storage:', error);
    }
  }

  async removeItem(key) {
    try {
      // Remove from cache immediately
      this.cache.delete(key);
      
      // Remove from persistent storage
      await Preferences.remove({ key });
    } catch (error) {
      console.warn('Failed to remove item from storage:', error);
    }
  }
}

console.log('🔧 Supabase config check:');
console.log('  - URL exists:', !!supabaseUrl);
console.log('  - URL value:', supabaseUrl);
console.log('  - Key exists:', !!supabaseAnonKey);
console.log('  - Key preview:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: new CapacitorStorage(),
    autoRefreshToken: true,
    detectSessionInUrl: false, // Disable for mobile apps
    flowType: 'pkce', // Use PKCE flow for better mobile compatibility
    debug: false // Disable debug logs for better performance
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-capacitor'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10 // Reduce realtime overhead
    }
  }
});

console.log('✅ Supabase client created successfully');
console.log('📱 Using optimized Capacitor storage for session persistence');

// Optimized session restoration for fast app startup
export const getSessionOptimized = async () => {
  try {
    // Start session check immediately but don't await it
    const sessionPromise = supabase.auth.getSession();
    
    // Return a promise that resolves quickly for UI, but allows background loading
    return new Promise((resolve) => {
      // First, try to get cached session data quickly
      sessionPromise.then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Session restoration error:', error);
          resolve(null);
        } else {
          resolve(session?.user || null);
        }
      }).catch(() => {
        resolve(null);
      });
      
      // Fallback timeout to prevent hanging
      setTimeout(() => {
        resolve(null);
      }, 1000); // Max 1 second wait
    });
  } catch (error) {
    console.warn('Session restoration failed:', error);
    return null;
  }
};

// Auth helpers
export const signInWithEmail = async (email, password) => {
  console.log('📤 Supabase signIn request:', JSON.stringify({ email, hasPassword: !!password }));
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  console.log('📥 Supabase signIn FULL response:', JSON.stringify({ data, error }, null, 2));
  
  if (data) {
    console.log('✅ SignIn data details:');
    console.log('  - User:', data.user ? JSON.stringify({
      id: data.user.id,
      email: data.user.email,
      email_confirmed_at: data.user.email_confirmed_at
    }) : 'null');
    console.log('  - Session:', data.session ? 'EXISTS' : 'null');
  }
  
  if (error) {
    console.log('❌ SignIn error details:', JSON.stringify({
      message: error.message,
      status: error.status,
      code: error.code || error.error_code,
      name: error.name,
      details: error.details,
      hint: error.hint,
      full_error: error
    }, null, 2));
  }
  
  return { data, error };
};

// Sign in with either email or username
export const signInWithIdentifier = async (identifier, password) => {
  try {
    const trimmed = (identifier || '').trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.toLowerCase());
    let emailToUse = null;

    if (isEmail) {
      emailToUse = trimmed.toLowerCase();
    } else {
      // Treat as username → resolve to email
      // Step 1: find profile by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', trimmed.toLowerCase())
        .maybeSingle();

      if (profileError || !profile) {
        return { data: null, error: { message: 'Username not found' } };
      }

      // Step 2: find email in public users table by auth user id
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('id', profile.id)
        .maybeSingle();

      if (userError || !userRow?.email) {
        return { data: null, error: { message: 'Could not resolve email for this username. Try signing in with your email instead.' } };
      }

      emailToUse = String(userRow.email).toLowerCase();
    }

    return await signInWithEmail(emailToUse, password);
  } catch (error) {
    return { data: null, error };
  }
};

export const signUpWithEmail = async (email, password, name, username) => {
  console.log('📤 Supabase signUp request:', JSON.stringify({ email, hasPassword: !!password, name }));
  
  // Test Supabase connection first
  try {
    const testConnection = await supabase.from('lists').select('count').limit(1);
    console.log('🔗 Supabase connection test:', testConnection.error ? 'FAILED' : 'SUCCESS');
  } catch (connError) {
    console.log('🔗 Supabase connection test: NETWORK ERROR', connError.message);
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name
      }
    }
  });
  
  console.log('📥 Supabase signUp FULL response:', JSON.stringify({ data, error }, null, 2));
  
  if (data) {
    console.log('✅ Data object details:');
    console.log('  - User:', data.user ? JSON.stringify({
      id: data.user.id,
      email: data.user.email,
      email_confirmed_at: data.user.email_confirmed_at,
      created_at: data.user.created_at
    }) : 'null');
    console.log('  - Session:', data.session ? 'EXISTS' : 'null');
    
    // Create user profile after successful signup (only if user is immediately confirmed)
    if (data.user && data.session && username) {
      try {
        const sanitizedUsername = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        console.log('👤 Creating user profile for:', sanitizedUsername);
        const profileResult = await createUserProfile(sanitizedUsername, name); // Pass display name
        console.log('✅ User profile created successfully:', profileResult);
        
        // Small delay to ensure profile is ready before auth state change triggers redirect
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (profileError) {
        console.error('❌ Failed to create user profile:', profileError);
        // Don't throw error - profile can be created later
      }
    }
  }
  
  if (error) {
    console.log('❌ Error details:', JSON.stringify({
      message: error.message,
      status: error.status,
      code: error.code || error.error_code,
      name: error.name,
      details: error.details,
      hint: error.hint,
      full_error: error
    }, null, 2));
  }
  
  return { data, error };
};

export const signInWithGoogle = async () => {
  const redirectTo = (Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform())
    ? 'bestlist://auth-callback'
    : window.location.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Optional: request refresh token from Google
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  return { data, error };
};

export const signInWithFacebook = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: window.location.origin
    }
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Database helpers
export const getUserLists = async (userId) => {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getListItems = async (listId) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createList = async (userId, name, color) => {
  const { data, error } = await supabase
    .from('lists')
    .insert([{ user_id: userId, name, color }])
    .select()
    .single();
  return { data, error };
};

export const addItemToList = async (listId, item) => {
  const { data, error } = await supabase
    .from('items')
    .insert([{ list_id: listId, ...item }])
    .select()
    .single();
  return { data, error };
};

// Legacy function - kept for compatibility
export const updateUserMetadata = async (userId, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const uploadPhotoWithOwner = async (filePath, file) => {
  const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : supabase.auth.user();
  if (!user) throw new Error('User not authenticated');
  const { data, error } = await supabase.storage.from('photos').upload(filePath, file, {
    upsert: false,
    metadata: { owner: user.id }
  });
  return { data, error };
};

export const deleteItemFromList = async (itemId) => {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId);
  return { error };
};

// Safer delete that removes related feed content first to satisfy FKs
export const deleteItemAndRelated = async (itemId) => {
  try {
    // Find posts referencing this item
    const { data: posts, error: postsFetchError } = await supabase
      .from('posts')
      .select('id')
      .eq('item_id', itemId);
    if (postsFetchError) return { error: postsFetchError };

    const postIds = (posts || []).map((p) => p.id);

    if (postIds.length > 0) {
      // Delete likes and comments referencing those posts
      const { error: likesError } = await supabase
        .from('likes')
        .delete()
        .in('post_id', postIds);
      if (likesError) return { error: likesError };

      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .in('post_id', postIds);
      if (commentsError) return { error: commentsError };

      // Delete the posts themselves
      const { error: postsDeleteError } = await supabase
        .from('posts')
        .delete()
        .eq('item_id', itemId);
      if (postsDeleteError) return { error: postsDeleteError };
    }

    // Finally delete the item
    const { error: itemDeleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    return { error: itemDeleteError || null };
  } catch (error) {
    return { error };
  }
};

// Search functions
export const searchUserContent = async (userId, query) => {
  if (!query.trim()) {
    return { data: [], error: null };
  }

  try {
    // Search lists by name
    const { data: lists, error: listsError } = await supabase
      .from('lists')
      .select('id, name, created_at, user_id')
      .eq('user_id', userId)
      .ilike('name', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (listsError) throw listsError;

    // Search items by name, notes, and tags
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        id, 
        name, 
        notes, 
        tags, 
        rating,
        image_url,
        is_stay_away,
        created_at,
        lists!inner(id, name, user_id)
      `)
      .eq('lists.user_id', userId)
      .or(`name.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (itemsError) throw itemsError;

    // Format results
    const searchResults = [
      ...lists.map(list => ({
        id: list.id,
        type: 'list',
        name: list.name,
        itemCount: 0, // Will be populated if needed
        created_at: list.created_at
      })),
      ...items.map(item => ({
        id: item.id,
        type: 'item',
        name: item.name,
        notes: item.notes,
        rating: item.rating,
        image_url: item.image_url,
        verdict: item.is_stay_away ? 'AVOID' : 'KEEP',
        list: item.lists.name,
        listId: item.lists.id,
        created_at: item.created_at
      }))
    ];

    // Sort by relevance and date
    searchResults.sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.name.toLowerCase() === query.toLowerCase();
      const bExact = b.name.toLowerCase() === query.toLowerCase();
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then by date
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return { data: searchResults.slice(0, 15), error: null };
  } catch (error) {
    console.error('Search error:', error);
    return { data: [], error };
  }
};

export const searchItems = async (listId, query) => {
  if (!query.trim()) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('list_id', listId)
      .or(`name.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    return { data: data || [], error };
  } catch (error) {
    console.error('Item search error:', error);
    return { data: [], error };
  }
};

// =====================
// FEED SYSTEM FUNCTIONS
// =====================

// Feed data fetching - OPTIMIZED with single query and joins
export const getFeedPosts = async (type = 'for_you', limit = 20, offset = 0) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    console.log('🚀 [getFeedPosts] OPTIMIZED: Starting single-query feed fetch...');
    const start = Date.now();

    let query;
    let followingUserIds = []; // Declare at function scope
    
    if (type === 'following' && user) {
      // OPTIMIZATION: Get posts with all related data in a single query using joins
      try {
        // First, get the list of users that the current user is following
        const { data: followingUsers, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingError) {
          console.error('Error getting following users:', followingError);
          return { data: [], error: followingError };
        }

        // If not following anyone, return empty array
        if (!followingUsers || followingUsers.length === 0) {
          console.log('User is not following anyone');
          return { data: [], error: null };
        }

        // Extract the user IDs
        followingUserIds = followingUsers.map(f => f.following_id);
        console.log(`📋 Following feed: Found ${followingUserIds.length} users being followed`);

        // Get posts with items and lists data (profiles fetched separately)
        query = supabase
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
              is_stay_away,
              place_name
            ),
            lists (
              name
            )
          `)
          .eq('is_public', true)
          .in('user_id', followingUserIds)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

      } catch (error) {
        console.error('Following feed error:', error);
        return { data: [], error };
      }
    }
    
    if (type === 'for_you') {
      // OPTIMIZED: Single query with joins for "For You" feed (profiles fetched separately)
      query = supabase
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
            is_stay_away,
            place_name
          ),
          lists (
            name
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    }
    
    let { data: posts, error } = await query;
    if (error) {
      console.error('Posts query error:', JSON.stringify({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      throw error;
    }

    if (!posts || posts.length === 0) {
      console.log('🚀 [getFeedPosts] No posts found');
      return { data: [], error: null };
    }

    const queryTime = Date.now() - start;
    console.log(`🚀 [getFeedPosts] OPTIMIZED: Main query completed in ${queryTime}ms for ${posts.length} posts`);

    // Now we need to get counts and user likes separately (these can't be joined efficiently)
    // Build a profile map for post authors
    const uniqueUserIds = [...new Set(posts.map(p => p.user_id))];
    const profileMap = {};
    if (uniqueUserIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', uniqueUserIds);
      (profilesData || []).forEach(p => { profileMap[p.id] = p; });
    }

    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        try {
          // Get only the counts and user likes (much faster than full data queries)
          const [likeCountResult, commentCountResult, userLikeResult] = await Promise.all([
            // Get like count
            supabase
              .from('likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id),
            
            // Get comment count  
            supabase
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id),
            
            // Check if current user liked this post
            supabase
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle()
          ]);

          const profile = profileMap[post.user_id] || null;
          const displayName = profile?.display_name || profile?.username || 'User';
          const avatarUrl = profile?.avatar_url || null;
          const enriched = {
            ...post,
            users: { email: 'N/A' }, // legacy
            profiles: profile || { username: 'User', display_name: 'User', avatar_url: null },
            items: post.items,
            lists: post.lists,
            like_count: likeCountResult.count || 0,
            comment_count: commentCountResult.count || 0,
            user_liked: !!userLikeResult.data,
            // Convenience shape for UI components (e.g., MainScreen PostCard)
            user: {
              name: displayName,
              avatar: avatarUrl
            }
          };
          return enriched;
        } catch (enrichError) {
          console.error('Error enriching post:', post.id, enrichError);
          // Return post with minimal data if enrichment fails
          return {
            ...post,
            users: { email: 'Unknown' },
            profiles: post.profiles || { username: 'Anonymous', display_name: 'Anonymous', avatar_url: null },
            items: post.items || { name: 'Unknown Item', rating: 3 },
            lists: post.lists || { name: 'Unknown List' },
            like_count: 0,
            comment_count: 0,
            user_liked: false,
            user: {
              name: 'Anonymous',
              avatar: null
            }
          };
        }
      })
    );

    const totalTime = Date.now() - start;
    console.log(`🚀 [getFeedPosts] OPTIMIZED: Complete in ${totalTime}ms - ${enrichedPosts.length} posts (1 main query + ${enrichedPosts.length * 3} count queries)`);

    return { data: enrichedPosts, error: null };
  } catch (error) {
    console.error('❌ Get feed posts error:', error?.message || 'Unknown error');
    console.error('❌ Error details:', JSON.stringify({
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      name: error?.name
    }, null, 2));
    return { data: [], error };
  }
};

export const getUserPosts = async (userIdOrUsername, limit = 20, offset = 0) => {
  try {
    console.log('🔍 getUserPosts called with:', userIdOrUsername);
    
    // First test if posts table exists and is accessible
    console.log('🔍 Testing posts table access...');
    const testQuery = await supabase.from('posts').select('count').limit(1);
    console.log('🔍 Posts table test result:', testQuery);
    
    // Check if it's a UUID (user ID) or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername);
    console.log('🔍 Is UUID?', isUUID);
    
    if (isUUID) {
      // First get the user profile
      console.log('🔍 Getting user profile for UUID:', userIdOrUsername);
      const { data: profile, error: profileError } = await getUserProfile(userIdOrUsername);
      console.log('🔍 Profile result:', { profile, profileError });
      
      if (profileError || !profile) {
        console.error('❌ User not found:', userIdOrUsername, profileError);
        return { data: [], error: profileError || new Error('User not found') };
      }
      
      // Query by user ID
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          item_id,
          list_id,
          is_public,
          location,
          created_at,
          updated_at,
          items:item_id(id, name, image_url, rating, notes, tags, is_stay_away, location),
          lists:list_id(id, name)
        `)
        .eq('user_id', userIdOrUsername)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      console.log('🔍 Posts query result:', { data: data?.length || 0, error });
      
      // If we got posts, enrich them with profile data
      if (data && data.length > 0) {
        console.log('🔍 Enriching posts with profile data...');
        const enrichedPosts = data.map(post => ({
          ...post,
          profiles: profile // Add the profile data we already have
        }));
        console.log('🔍 Enriched posts:', enrichedPosts.length);
        return { data: enrichedPosts, error };
      }

      return { data: data || [], error };
    } else {
      // First get the user profile to get their ID
      console.log('🔍 Getting user profile for username:', userIdOrUsername);
      const { data: profile, error: profileError } = await getUserProfile(userIdOrUsername);
      console.log('🔍 Profile result:', { profile, profileError });
      
      if (profileError || !profile) {
        console.error('❌ User not found:', userIdOrUsername, profileError);
        return { data: [], error: profileError || new Error('User not found') };
      }
      
      console.log('🔍 Found user profile, querying posts for user ID:', profile.id);
      
      // Then query posts by user ID  
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          item_id,
          list_id,
          is_public,
          location,
          created_at,
          updated_at,
          items:item_id(id, name, image_url, rating, notes, tags, is_stay_away, location),
          lists:list_id(id, name)
        `)
        .eq('user_id', profile.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      console.log('🔍 Posts query result:', { data: data?.length || 0, error });
      
      // If we got posts, enrich them with profile data
      if (data && data.length > 0) {
        console.log('🔍 Enriching posts with profile data...');
        const enrichedPosts = data.map(post => ({
          ...post,
          profiles: profile // Add the profile data we already have
        }));
        console.log('🔍 Enriched posts:', enrichedPosts.length);
        return { data: enrichedPosts, error };
      }
      
      return { data: data || [], error };
    }


      } catch (error) {
      console.error('❌ Get user posts error:', error?.message || 'Unknown error');
      console.error('❌ Error details:', JSON.stringify({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        name: error?.name
      }, null, 2));
      return { data: [], error };
    }
};

export const createPost = async (itemId, listId, isPublic = true, location = null) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('posts')
      .insert([{
        user_id: user.id,
        item_id: itemId,
        list_id: listId,
        is_public: isPublic,
        location: location
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('❌ Create post error:', error?.message || 'Unknown error');
    console.error('❌ Error details:', JSON.stringify({
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      name: error?.name
    }, null, 2));
    return { data: null, error };
  }
};

// Social interactions
export const likePost = async (postId) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('likes')
      .insert([{
        user_id: user.id,
        post_id: postId
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Like post error:', error);
    return { data: null, error };
  }
};

export const unlikePost = async (postId) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    return { error };
  } catch (error) {
    console.error('Unlike post error:', error);
    return { error };
  }
};

export const getPostLikes = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select(`
        id,
        created_at,
        users:user_id(email),
        profiles:user_id(username, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (error) {
    console.error('Get post likes error:', error);
    return { data: [], error };
  }
};

export const commentOnPost = async (postId, content, parentId = null) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    // Insert comment without joins
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        user_id: user.id,
        post_id: postId,
        parent_id: parentId,
        content: content
      }])
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_id
      `)
      .single();

    if (error) {
      console.error('❌ Comment insert error:', error?.message || 'Unknown error');
      console.error('❌ Error details:', JSON.stringify({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        name: error?.name
      }, null, 2));
      return { data: null, error };
    }

    // Get user profile separately
    const { data: profile, error: profileError } = await getUserProfile(user.id);
    
    if (!profileError && profile) {
      // Enrich with profile data
      data.profiles = profile;
    }

    return { data, error: null };
  } catch (error) {
    console.error('❌ Comment on post exception:', error?.message || 'Unknown error');
    console.error('❌ Exception details:', JSON.stringify({
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      name: error?.name
    }, null, 2));
    return { data: null, error };
  }
};

export const getPostComments = async (postId) => {
  try {
    // Get comments (no FK joins to avoid schema cache dependency)
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user_id,
        parent_id
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Comments query error:', error?.message || 'Unknown error');
      console.error('❌ Error details:', JSON.stringify({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        name: error?.name
      }, null, 2));
      return { data: [], error };
    }

    if (!data || data.length === 0) {
      console.log('💬 [getPostComments] No comments found');
      return { data: [], error: null };
    }

    // Fetch profiles for unique user IDs
    const userIds = [...new Set(data.map(c => c.user_id))];
    const profileMap = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);
      (profilesData || []).forEach(p => { profileMap[p.id] = p; });
    }

    // Enrich comments with profile data and organize into threads
    const enrichedComments = data.map(comment => ({
      ...comment,
      profiles: profileMap[comment.user_id] || null,
      replies: []
    }));

    // Organize comments into threads (parent comments with their replies)
    const commentMap = {};
    const topLevelComments = [];

    // First pass: create a map of all comments
    enrichedComments.forEach(comment => {
      commentMap[comment.id] = comment;
    });

    // Second pass: organize into threads
    enrichedComments.forEach(comment => {
      if (comment.parent_id && commentMap[comment.parent_id]) {
        // This is a reply - add it to the parent's replies array
        commentMap[comment.parent_id].replies.push(comment);
      } else {
        // This is a top-level comment
        topLevelComments.push(comment);
      }
    });

    return { data: topLevelComments, error: null };
  } catch (error) {
    console.error('❌ Get post comments exception:', error?.message || 'Unknown error');
    console.error('❌ Exception details:', JSON.stringify({
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      name: error?.name
    }, null, 2));
    return { data: [], error };
  }
};

// Get comment count for a post
export const getPostCommentCount = async (postId) => {
  try {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return { count: count || 0, error };
  } catch (error) {
    console.error('❌ Get comment count error:', error);
    return { count: 0, error };
  }
};

// User following
export const followUser = async (userId) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('follows')
      .insert([{
        follower_id: user.id,
        following_id: userId
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Follow user error:', error);
    return { data: null, error };
  }
};

export const unfollowUser = async (userId) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    return { error };
  } catch (error) {
    console.error('Unfollow user error:', error);
    return { error };
  }
};

export const getUserFollowers = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        id,
        created_at,
        follower_id
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (error) {
    console.error('Get user followers error:', error);
    return { data: [], error };
  }
};

export const getUserFollowing = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        id,
        created_at,
        following_id
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (error) {
    console.error('Get user following error:', error);
    return { data: [], error };
  }
};

export const isUserFollowingAnyone = async () => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return { isFollowing: false, error: null };

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .limit(1);

    return { 
      isFollowing: data && data.length > 0, 
      error 
    };
  } catch (error) {
    console.error('Check if user following anyone error:', error);
    return { isFollowing: false, error };
  }
};

// User profiles
export const createUserProfile = async (username, displayName = '', bio = '') => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        id: user.id,
        username: username,
        display_name: displayName || username,
        bio: bio || 'Food Explorer'
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('❌ Create user profile error:', error?.message || 'Unknown error');
    console.error('❌ Error details:', JSON.stringify({
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      name: error?.name
    }, null, 2));
    return { data: null, error };
  }
};

export const getUserProfile = async (userIdOrUsername) => {
  try {
    let query = supabase.from('profiles').select('*');
    
    // Check if it's a UUID (user ID) or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername);
    
    if (isUUID) {
      query = query.eq('id', userIdOrUsername);
    } else {
      query = query.eq('username', userIdOrUsername);
    }

    const { data, error } = await query.single();

    return { data, error };
  } catch (error) {
    console.error('Get user profile error:', error);
    return { data: null, error };
  }
};

export const updateUserProfile = async (updates) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Update user profile error:', error);
    return { data: null, error };
  }
};



export const searchUsers = async (query) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .or(`username.ilike.%${query}%, display_name.ilike.%${query}%`)
      .limit(20);

    return { data: data || [], error };
  } catch (error) {
    console.error('Search users error:', error);
    return { data: [], error };
  }
};

// Check if username is available
export const checkUsernameAvailability = async (username) => {
  try {
    if (!username || username.length < 3) {
      return { available: false, error: 'Username too short' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows returned - username is available
      return { available: true, error: null };
    } else if (error) {
      // Other error
      return { available: false, error: error.message };
    } else {
      // Username found - not available
      return { available: false, error: 'Username already taken' };
    }
  } catch (error) {
    console.error('Username check error:', error);
    return { available: false, error: 'Failed to check username' };
  }
};

