import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const useUserStats = (userId) => {
  const hasLoaded = useRef(false);
  const currentUserId = useRef(null);
  const [stats, setStats] = useState({
    photosTaken: 0,
    listsCreated: 0,
    uniqueIngredients: 0,
    likesReceived: 0,
    totalItems: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔍 [useUserStats] useEffect triggered for user:', userId);
    
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check if we've already loaded stats for this specific user
    if (hasLoaded.current && currentUserId.current === userId) {
      console.log('🔍 [useUserStats] Stats already loaded for user:', userId);
      setLoading(false);
      return;
    }

    // If user changed, reset the loaded flag
    if (currentUserId.current !== userId) {
      console.log('🔄 [useUserStats] User changed, resetting cache for new user:', userId);
      hasLoaded.current = false;
      currentUserId.current = userId;
    }

    const fetchUserStats = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 [useUserStats] Starting stats fetch for user:', userId);
        
        // Add timeout protection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('🚨 [useUserStats] TIMEOUT: Aborting stats queries after 10 seconds');
          controller.abort();
        }, 30000);
        
        // Get items first - only select what we need for stats
        const itemsResult = await supabase
          .from('items')
          .select('id, rating, list_id')
          .abortSignal(controller.signal);

        if (itemsResult.error) throw itemsResult.error;

        const allItems = itemsResult.data || [];
        
        // Filter items to only include those from user's lists
        const userListsResult = await supabase
          .from('lists')
          .select('id')
          .eq('user_id', userId)
          .abortSignal(controller.signal);
          
        if (userListsResult.error) throw userListsResult.error;
        
        const userListIds = userListsResult.data.map(list => list.id);
        const items = allItems.filter(item => userListIds.includes(item.list_id));
        const itemIds = items.map(item => item.id);
        
        console.log('🔍 [useUserStats] Found items:', items.length, 'out of', allItems.length, 'total items');

        // Fetch remaining stats in parallel
        const [
          listsResult,
          postsResult,
          ratingsResult
        ] = await Promise.all([
          // Get lists created
          supabase
            .from('lists')
            .select('id')
            .eq('user_id', userId)
            .abortSignal(controller.signal),
          
          // Get posts for user's items (to get likes)
          itemIds.length > 0 
            ? supabase
                .from('posts')
                .select('id, item_id')
                .in('item_id', itemIds)
                .abortSignal(controller.signal)
            : Promise.resolve({ data: [], error: null }),
          
          // Get average rating - use the filtered items we already have
          Promise.resolve({ data: items.filter(item => item.rating !== null && item.rating > 0), error: null })
        ]);

        clearTimeout(timeoutId);
        
        // Handle errors
        if (listsResult.error) throw listsResult.error;
        if (postsResult.error) throw postsResult.error;
        if (ratingsResult.error) throw ratingsResult.error;

        const lists = listsResult.data || [];
        const posts = postsResult.data || [];
        const ratings = ratingsResult.data || [];

        // Calculate stats
        // For photos taken, we'll need to check if image_url exists
        // Since we're not loading image_url, we'll use a separate query for this
        const photosResult = await supabase
          .from('items')
          .select('id')
          .in('id', itemIds)
          .not('image_url', 'is', null)
          .abortSignal(controller.signal);
          
        if (photosResult.error) throw photosResult.error;
        
        const photosTaken = photosResult.data.length;
        const listsCreated = lists.length;
        const totalItems = items.length;
        
        // Calculate average rating
        const validRatings = ratings.filter(r => r.rating !== null && r.rating > 0);
        const avgRating = validRatings.length > 0 
          ? (validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length).toFixed(1)
          : 0;

        // For likes received, we need to get likes on user's posts
        const postIds = posts.map(post => post.id);
        const likesReceived = postIds.length > 0 
          ? (await supabase
              .from('likes')
              .select('id')
              .in('post_id', postIds)
              .abortSignal(controller.signal)).data?.length || 0
          : 0;

        // For unique ingredients, we'll use total items for now
        // You might want to add a separate ingredients table or tags system
        const uniqueIngredients = totalItems;

        const calculatedStats = {
          photosTaken,
          listsCreated,
          uniqueIngredients,
          likesReceived,
          totalItems,
          avgRating: parseFloat(avgRating)
        };
        
        console.log('🔍 [useUserStats] Calculated stats:', JSON.stringify(calculatedStats, null, 2));
        
        setStats(calculatedStats);
        hasLoaded.current = true;

      } catch (err) {
        console.error('🚨 [useUserStats] Error fetching user stats:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
        if (err.name === 'AbortError') {
          console.error('🚨 [useUserStats] Stats fetch timed out after 10 seconds');
          setError('Stats loading timed out. Please check your connection.');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [userId]);

  const resetStats = () => {
    hasLoaded.current = false;
    setStats({
      photosTaken: 0,
      listsCreated: 0,
      uniqueIngredients: 0,
      likesReceived: 0,
      totalItems: 0,
      avgRating: 0
    });
    setLoading(true);
    setError(null);
  };

  const refreshStats = async () => {
    console.log('🔄 [useUserStats] Refreshing stats for user:', userId);
    hasLoaded.current = false;
    setLoading(true);
    setError(null);
    
    // Trigger a re-fetch by calling the effect logic
    if (userId) {
      const fetchUserStats = async () => {
        try {
          setLoading(true);
          setError(null);

          console.log('🔍 [useUserStats] Starting stats refresh for user:', userId);
          
          // Add timeout protection
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log('🚨 [useUserStats] TIMEOUT: Aborting stats queries after 10 seconds');
            controller.abort();
          }, 30000);
          
          // Get items first - only select what we need for stats
          const itemsResult = await supabase
            .from('items')
            .select('id, rating, list_id')
            .abortSignal(controller.signal);

          if (itemsResult.error) throw itemsResult.error;

          const allItems = itemsResult.data || [];
          
          // Filter items to only include those from user's lists
          const userListsResult = await supabase
            .from('lists')
            .select('id')
            .eq('user_id', userId)
            .abortSignal(controller.signal);
            
          if (userListsResult.error) throw userListsResult.error;
          
          const userListIds = userListsResult.data.map(list => list.id);
          const items = allItems.filter(item => userListIds.includes(item.list_id));
          const itemIds = items.map(item => item.id);
          
          console.log('🔍 [useUserStats] Found items:', items.length, 'out of', allItems.length, 'total items');

          // Fetch remaining stats in parallel
          const [
            listsResult,
            postsResult,
            ratingsResult
          ] = await Promise.all([
            // Get lists created
            supabase
              .from('lists')
              .select('id')
              .eq('user_id', userId)
              .abortSignal(controller.signal),
            
            // Get posts for user's items (to get likes)
            itemIds.length > 0 
              ? supabase
                  .from('posts')
                  .select('id, item_id')
                  .in('item_id', itemIds)
                  .abortSignal(controller.signal)
              : Promise.resolve({ data: [], error: null }),
            
            // Get average rating - use the filtered items we already have
            Promise.resolve({ data: items.filter(item => item.rating !== null && item.rating > 0), error: null })
          ]);

          clearTimeout(timeoutId);
          
          // Handle errors
          if (listsResult.error) throw listsResult.error;
          if (postsResult.error) throw postsResult.error;
          if (ratingsResult.error) throw ratingsResult.error;

          const lists = listsResult.data || [];
          const posts = postsResult.data || [];
          const ratings = ratingsResult.data || [];

          // Calculate stats
          // For photos taken, we'll need to check if image_url exists
          // Since we're not loading image_url, we'll use a separate query for this
          const photosResult = await supabase
            .from('items')
            .select('id')
            .in('id', itemIds)
            .not('image_url', 'is', null)
            .abortSignal(controller.signal);
            
          if (photosResult.error) throw photosResult.error;
          
          const photosTaken = photosResult.data.length;
          const listsCreated = lists.length;
          const totalItems = items.length;
          
          // Calculate average rating
          const validRatings = ratings.filter(r => r.rating !== null && r.rating > 0);
          const avgRating = validRatings.length > 0 
            ? (validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length).toFixed(1)
            : 0;

          // For likes received, we need to get likes on user's posts
          const postIds = posts.map(post => post.id);
          const likesReceived = postIds.length > 0 
            ? (await supabase
                .from('likes')
                .select('id')
                .in('post_id', postIds)
                .abortSignal(controller.signal)).data?.length || 0
            : 0;

          // For unique ingredients, we'll use total items for now
          // You might want to add a separate ingredients table or tags system
          const uniqueIngredients = totalItems;

          const calculatedStats = {
            photosTaken,
            listsCreated,
            uniqueIngredients,
            likesReceived,
            totalItems,
            avgRating: parseFloat(avgRating)
          };
          
          console.log('🔍 [useUserStats] Refreshed stats:', JSON.stringify(calculatedStats, null, 2));
          
          setStats(calculatedStats);
          hasLoaded.current = true;
          currentUserId.current = userId;

        } catch (err) {
          console.error('🚨 [useUserStats] Error refreshing user stats:', JSON.stringify({
            message: err.message,
            name: err.name,
            details: err.details,
            hint: err.hint,
            code: err.code,
            fullError: err
          }, null, 2));
          if (err.name === 'AbortError') {
            console.error('🚨 [useUserStats] Stats refresh timed out after 10 seconds');
            setError('Stats loading timed out. Please check your connection.');
          } else {
            setError(err.message);
          }
        } finally {
          setLoading(false);
        }
      };

      await fetchUserStats();
    }
  };

  return { stats, loading, error, resetStats, refreshStats };
};

export default useUserStats; 