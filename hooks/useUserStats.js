import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const useUserStats = (userId) => {
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
    if (!userId) {
      setLoading(false);
      return;
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
        }, 10000);
        
        // Get items first
        const itemsResult = await supabase
          .from('items')
          .select('id, image_url, rating')
          .eq('user_id', userId)
          .abortSignal(controller.signal);

        if (itemsResult.error) throw itemsResult.error;

        const items = itemsResult.data || [];
        const itemIds = items.map(item => item.id);
        
        console.log('🔍 [useUserStats] Found items:', items.length);

        // Fetch remaining stats in parallel
        const [
          listsResult,
          likesResult,
          ratingsResult
        ] = await Promise.all([
          // Get lists created
          supabase
            .from('lists')
            .select('id')
            .eq('user_id', userId)
            .abortSignal(controller.signal),
          
          // Get likes received (from likes table)
          itemIds.length > 0 
            ? supabase
                .from('likes')
                .select('id')
                .in('item_id', itemIds)
                .abortSignal(controller.signal)
            : Promise.resolve({ data: [], error: null }),
          
          // Get average rating
          supabase
            .from('items')
            .select('rating')
            .eq('user_id', userId)
            .not('rating', 'is', null)
            .abortSignal(controller.signal)
        ]);

        clearTimeout(timeoutId);
        
        // Handle errors
        if (listsResult.error) throw listsResult.error;
        if (likesResult.error) throw likesResult.error;
        if (ratingsResult.error) throw ratingsResult.error;

        const lists = listsResult.data || [];
        const likes = likesResult.data || [];
        const ratings = ratingsResult.data || [];

        // Calculate stats
        const photosTaken = items.filter(item => item.image_url).length;
        const listsCreated = lists.length;
        const totalItems = items.length;
        
        // Calculate average rating
        const validRatings = ratings.filter(r => r.rating !== null && r.rating > 0);
        const avgRating = validRatings.length > 0 
          ? (validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length).toFixed(1)
          : 0;

        // For likes received, we need to get likes on user's items
        // This is a simplified version - you might need to adjust based on your likes table structure
        const likesReceived = likes.length;

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

      } catch (err) {
        console.error('🚨 [useUserStats] Error fetching user stats:', err);
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

  return { stats, loading, error };
};

export default useUserStats; 