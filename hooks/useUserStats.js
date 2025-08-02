import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useUserStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchUserStats = async (userId) => {
    if (!userId) return;
    
    console.log('🔍 [useUserStats] Starting stats fetch with direct API calls...');
    const startTime = Date.now();
    
    try {
      // Use direct fetch instead of Supabase client
      const supabaseUrl = 'https://jdadigamrbeenkxdkwer.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI';
      
      // Step 1: Get items count
      console.log('🔍 [useUserStats] Step 1: Fetching items...');
      const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/items?select=count&user_id=eq.${userId}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!itemsResponse.ok) {
        throw new Error(`Items fetch failed: ${itemsResponse.status}`);
      }
      
      const itemsData = await itemsResponse.json();
      const totalItems = itemsData[0]?.count || 0;
      console.log('🔍 [useUserStats] Total items found:', totalItems);
      
      // Step 2: Get items with image_url (photos taken)
      const photosResponse = await fetch(`${supabaseUrl}/rest/v1/items?select=count&user_id=eq.${userId}&image_url=not.is.null`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!photosResponse.ok) {
        throw new Error(`Photos fetch failed: ${photosResponse.status}`);
      }
      
      const photosData = await photosResponse.json();
      const photosTaken = photosData[0]?.count || 0;
      console.log('🔍 [useUserStats] Photos taken:', photosTaken);
      
      // Step 3: Get lists count
      const listsResponse = await fetch(`${supabaseUrl}/rest/v1/lists?select=count&user_id=eq.${userId}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!listsResponse.ok) {
        throw new Error(`Lists fetch failed: ${listsResponse.status}`);
      }
      
      const listsData = await listsResponse.json();
      const listsCreated = listsData[0]?.count || 0;
      console.log('🔍 [useUserStats] Lists created:', listsCreated);
      
      // Step 4: Get unique ingredients (items with different names)
      const uniqueResponse = await fetch(`${supabaseUrl}/rest/v1/items?select=name&user_id=eq.${userId}&name=not.is.null`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!uniqueResponse.ok) {
        throw new Error(`Unique ingredients fetch failed: ${uniqueResponse.status}`);
      }
      
      const uniqueData = await uniqueResponse.json();
      const uniqueIngredients = new Set(uniqueData.map(item => item.name?.toLowerCase())).size;
      console.log('🔍 [useUserStats] Unique ingredients:', uniqueIngredients);
      
      // Step 5: Get average rating
      const ratingResponse = await fetch(`${supabaseUrl}/rest/v1/items?select=rating&user_id=eq.${userId}&rating=not.is.null`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!ratingResponse.ok) {
        throw new Error(`Rating fetch failed: ${ratingResponse.status}`);
      }
      
      const ratingData = await ratingResponse.json();
      const avgRating = ratingData.length > 0 
        ? ratingData.reduce((sum, item) => sum + (item.rating || 0), 0) / ratingData.length 
        : 0;
      console.log('🔍 [useUserStats] Average rating:', avgRating);
      
      // Step 6: Get likes received (from posts)
      const likesResponse = await fetch(`${supabaseUrl}/rest/v1/likes?select=count&post_id=in.(select id from posts where user_id=eq.${userId})`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!likesResponse.ok) {
        throw new Error(`Likes fetch failed: ${likesResponse.status}`);
      }
      
      const likesData = await likesResponse.json();
      const likesReceived = likesData[0]?.count || 0;
      console.log('🔍 [useUserStats] Likes received:', likesReceived);
      
      // Calculate final stats
      const calculatedStats = {
        photosTaken,
        listsCreated,
        uniqueIngredients,
        likesReceived,
        totalItems,
        avgRating: Math.round(avgRating * 10) / 10 // Round to 1 decimal place
      };
      
      const endTime = Date.now();
      console.log('🔍 [useUserStats] Stats calculated in:', endTime - startTime, 'ms');
      console.log('🔍 [useUserStats] Final stats:', JSON.stringify(calculatedStats, null, 2));
      
      setStats(calculatedStats);
      setError(null);
      
    } catch (err) {
      console.error('🔍 [useUserStats] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      console.log('🔍 [useUserStats] Starting stats fetch for user:', user.id);
      fetchUserStats(user.id);
    } else {
      console.log('🔍 [useUserStats] No user, setting empty stats');
      setStats(null);
      setLoading(false);
    }
  }, [user?.id]);

  return {
    stats,
    loading,
    error,
    refresh: () => user?.id && fetchUserStats(user.id)
  };
}; 