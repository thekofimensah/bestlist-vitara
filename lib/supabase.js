import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase config check:');
console.log('  - URL exists:', !!supabaseUrl);
console.log('  - URL value:', supabaseUrl);
console.log('  - Key exists:', !!supabaseAnonKey);
console.log('  - Key preview:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

console.log('✅ Supabase client created successfully');

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

export const signUpWithEmail = async (email, password, name) => {
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
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
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

// Feed data fetching
export const getFeedPosts = async (type = 'for_you', limit = 20, offset = 0) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    let query;
    
    if (type === 'following' && user) {
      // Use the database function for following feed
      const { data, error } = await supabase.rpc('get_user_feed', {
        user_id_param: user.id,
        limit_param: limit,
        offset_param: offset
      });
      return { data: data || [], error };
    } else {
      // For "For You" feed - get all public posts
      query = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          item_id,
          list_id,
          location,
          created_at,
          users:user_id(email),
          profiles:user_id(username, display_name, avatar_url),
          items:item_id(name, image_url, rating, notes, tags, is_stay_away),
          lists:list_id(name)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    }
    
    const { data: posts, error } = await query;
    if (error) throw error;

    // Get like counts and user likes for each post
    const enrichedPosts = await Promise.all(
      (posts || []).map(async (post) => {
        // Get like count
        const { count: likeCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Get comment count
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Check if current user liked this post
        const { data: userLike } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .single();

        return {
          ...post,
          like_count: likeCount || 0,
          comment_count: commentCount || 0,
          user_liked: !!userLike
        };
      })
    );

    return { data: enrichedPosts, error: null };
  } catch (error) {
    console.error('Get feed posts error:', error);
    return { data: [], error };
  }
};

export const getUserPosts = async (userId, limit = 20, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        item_id,
        list_id,
        location,
        created_at,
        items:item_id(name, image_url, rating, notes, tags, is_stay_away),
        lists:list_id(name)
      `)
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return { data: data || [], error };
  } catch (error) {
    console.error('Get user posts error:', error);
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
    console.error('Create post error:', error);
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

export const commentOnPost = async (postId, content) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert([{
        user_id: user.id,
        post_id: postId,
        content: content
      }])
      .select(`
        id,
        content,
        created_at,
        users:user_id(email),
        profiles:user_id(username, display_name, avatar_url)
      `)
      .single();

    return { data, error };
  } catch (error) {
    console.error('Comment on post error:', error);
    return { data: null, error };
  }
};

export const getPostComments = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        users:user_id(email),
        profiles:user_id(username, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    return { data: data || [], error };
  } catch (error) {
    console.error('Get post comments error:', error);
    return { data: [], error };
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
        follower:follower_id(email),
        follower_profile:follower_id(username, display_name, avatar_url)
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
        following:following_id(email),
        following_profile:following_id(username, display_name, avatar_url)
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (error) {
    console.error('Get user following error:', error);
    return { data: [], error };
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
        display_name: displayName,
        bio: bio
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Create user profile error:', error);
    return { data: null, error };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

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