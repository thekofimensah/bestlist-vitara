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

    let subscription;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 [useUserStats] Fetching stats for user:', userId);
        
        // Simple, fast query - just one row from profile_stats
        const { data, error } = await supabase
          .from('profile_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          // If no stats row exists, create one
          if (error.code === 'PGRST116') {
            console.log('🔧 [useUserStats] No stats found, creating initial row');
            await supabase.rpc('ensure_profile_stats', { target_user_id: userId });
            
            // Fetch again after creating
            const { data: newData, error: newError } = await supabase
              .from('profile_stats')
              .select('*')
              .eq('user_id', userId)
              .single();
            
            if (newError) throw newError;
            
            setStats({
              photosTaken: newData.photos_taken || 0,
              listsCreated: newData.lists_created || 0,
              uniqueIngredients: newData.unique_ingredients || 0,
              likesReceived: newData.likes_received || 0,
              totalItems: newData.total_items || 0,
              avgRating: parseFloat(newData.avg_rating) || 0
            });
          } else {
            throw error;
          }
        } else {
          setStats({
            photosTaken: data.photos_taken || 0,
            listsCreated: data.lists_created || 0,
            uniqueIngredients: data.unique_ingredients || 0,
            likesReceived: data.likes_received || 0,
            totalItems: data.total_items || 0,
            avgRating: parseFloat(data.avg_rating) || 0
          });
        }

        console.log('✅ [useUserStats] Stats loaded successfully');

      } catch (err) {
        console.error('🚨 [useUserStats] Error fetching stats:', {
          message: err.message,
          code: err.code,
          details: err.details
        });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Set up real-time subscription for automatic updates
    const setupRealtimeSubscription = () => {
      console.log('🔔 [useUserStats] Setting up real-time subscription for user:', userId);
      
      subscription = supabase
        .channel(`user_stats_${userId}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'profile_stats', 
            filter: `user_id=eq.${userId}` 
          },
          (payload) => {
            console.log('🔔 [useUserStats] Real-time stats update received:', payload);
            
            if (payload.new) {
              setStats({
                photosTaken: payload.new.photos_taken || 0,
                listsCreated: payload.new.lists_created || 0,
                uniqueIngredients: payload.new.unique_ingredients || 0,
                likesReceived: payload.new.likes_received || 0,
                totalItems: payload.new.total_items || 0,
                avgRating: parseFloat(payload.new.avg_rating) || 0
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('🔔 [useUserStats] Subscription status:', status);
        });
    };

    setupRealtimeSubscription();

    // Cleanup function
    return () => {
      if (subscription) {
        console.log('🧹 [useUserStats] Cleaning up subscription');
        supabase.removeChannel(subscription);
      }
    };
  }, [userId]);

  // No more manual refresh needed - stats update automatically via triggers!
  // But keeping a simple refresh function for edge cases
  const refreshStats = async () => {
    if (!userId) return;
    
    console.log('🔄 [useUserStats] Manual refresh requested');
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profile_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setStats({
        photosTaken: data.photos_taken || 0,
        listsCreated: data.lists_created || 0,
        uniqueIngredients: data.unique_ingredients || 0,
        likesReceived: data.likes_received || 0,
        totalItems: data.total_items || 0,
        avgRating: parseFloat(data.avg_rating) || 0
      });
    } catch (err) {
      console.error('🚨 [useUserStats] Error refreshing stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refreshStats };
};

export default useUserStats;