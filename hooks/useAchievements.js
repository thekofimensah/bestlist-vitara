import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import useUserStats from './useUserStats';
import { useGlobalAchievements } from './useGlobalAchievements.jsx';

const useAchievements = () => {
  const { user } = useAuth();
  const { stats } = useUserStats(user?.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const globalAchievements = useGlobalAchievements();
  const showAchievement = globalAchievements?.showAchievement || (() => {});

  // Get all available achievements
  const getAchievements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('active', true)
        .order('created_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching achievements:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      return [];
    }
  }, []);

  // Get user's earned achievements
  const getUserAchievements = useCallback(async (userId = user?.id) => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (
            name,
            description,
            icon,
            rarity,
            category,
            reward_points
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user achievements:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      return [];
    }
  }, [user?.id]);

  // Check if user has already earned a specific achievement
  const hasAchievement = useCallback(async (achievementId, userId = user?.id) => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking achievement:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      return false;
    }
  }, [user?.id]);

  // Award achievement to user
  const awardAchievement = useCallback(async (achievementId, progressData = null) => {
    if (!user?.id) return false;

    try {
      // Check if user already has this achievement
      const alreadyHas = await hasAchievement(achievementId);
      if (alreadyHas) return false;

      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId,
          progress_data: progressData
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error awarding achievement:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      return false;
    }
  }, [user?.id, hasAchievement]);

  // Check counter-based achievements
  const checkCounterAchievement = useCallback(async (achievement) => {
    const { criteria } = achievement;
    const field = criteria.field;
    const target = criteria.target;

    const currentValue = stats[field] || 0;
    
    if (currentValue >= target) {
      const awarded = await awardAchievement(achievement.id);
      if (awarded) {
        return { achievement, awarded: true };
      }
    }
    return null;
  }, [stats, awardAchievement]);

  // Check first action achievements
  const checkFirstActionAchievement = useCallback(async (achievement, actionType) => {
    const { criteria } = achievement;
    
    if (criteria.action === actionType) {
      const awarded = await awardAchievement(achievement.id);
      if (awarded) {
        return { achievement, awarded: true };
      }
    }
    return null;
  }, [awardAchievement]);

  // Check global first achievements (e.g., first to photo a product)
  const checkGlobalFirstAchievement = useCallback(async (achievement, context) => {
    const { criteria } = achievement;
    
    if (criteria.type !== 'global_first') return null;

    try {
      let query;
      
      if (criteria.scope === 'product' && context.ai_product_name) {
        // Check if anyone else has the same AI-generated product name
        // Only check AI-generated names, not user-entered names
        if (!context.ai_product_name || context.user_product_name) {
          // Skip if no AI product name or if user entered their own name
          return null;
        }
        
        // First get all lists that belong to other users
        const { data: otherUserLists, error: listsError } = await supabase
          .from('lists')
          .select('id')
          .neq('user_id', user.id);
          
        if (listsError) throw listsError;
        
        if (!otherUserLists || otherUserLists.length === 0) {
          // No other users exist, so this is definitely a first
          const awarded = await awardAchievement(achievement.id, { context });
          if (awarded) {
            return { achievement, awarded: true, isGlobalFirst: true };
          }
          return null;
        }
        
        const otherUserListIds = otherUserLists.map(list => list.id);
        
        // Check if any other user has the same AI-generated product name
        query = supabase
          .from('items')
          .select('id')
          .eq('ai_product_name', context.ai_product_name)
          .not('image_url', 'is', null)
          .in('list_id', otherUserListIds);
      } else if (criteria.scope === 'country' && context.location) {
        // Check if anyone else has photographed from this country
        const country = extractCountryFromLocation(context.location);
        if (!country) return null;
        
        // First get all lists that belong to other users
        const { data: otherUserLists, error: listsError } = await supabase
          .from('lists')
          .select('id')
          .neq('user_id', user.id);
          
        if (listsError) throw listsError;
        
        if (!otherUserLists || otherUserLists.length === 0) {
          // No other users exist, so this is definitely a first
          const awarded = await awardAchievement(achievement.id, { context });
          if (awarded) {
            return { achievement, awarded: true, isGlobalFirst: true };
          }
          return null;
        }
        
        const otherUserListIds = otherUserLists.map(list => list.id);
        
        // Check if any other user has items from this country
        query = supabase
          .from('items')
          .select('id')
          .ilike('location', `%${country}%`)
          .not('image_url', 'is', null)
          .in('list_id', otherUserListIds);
      }

      if (!query) return null;

      const { data, error } = await query.limit(1);
      if (error) throw error;

      // If no one else has done this action, award the achievement
      if (!data || data.length === 0) {
        const awarded = await awardAchievement(achievement.id, { context });
        if (awarded) {
          return { achievement, awarded: true, isGlobalFirst: true };
        }
      }
    } catch (error) {
      console.error('Error checking global first achievement:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
    }
    
    return null;
  }, [user?.id, awardAchievement]);

  // Main function to check achievements after user actions
  const checkAchievements = useCallback(async (actionType, context = {}) => {
    if (!user?.id || isProcessing) return [];

    setIsProcessing(true);
    
    try {
      const achievements = await getAchievements();
      const newAchievements = [];

      for (const achievement of achievements) {
        const { criteria } = achievement;
        let result = null;

        switch (criteria.type) {
          case 'counter':
            result = await checkCounterAchievement(achievement);
            break;
          
          case 'first_action':
            result = await checkFirstActionAchievement(achievement, actionType);
            break;
          
          case 'global_first':
            result = await checkGlobalFirstAchievement(achievement, context);
            break;
          
          // Add more types as needed (streak, rating_diversity, etc.)
          default:
            break;
        }

        if (result) {
          newAchievements.push(result);
          
          // 🎉 Trigger notification for new achievement
          showAchievement({
            achievement: result.achievement,
            isGlobalFirst: result.isGlobalFirst || false
          });
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, isProcessing, getAchievements, checkCounterAchievement, checkFirstActionAchievement, checkGlobalFirstAchievement, showAchievement]);

  return {
    checkAchievements,
    getUserAchievements,
    getAchievements,
    hasAchievement,
    isProcessing
  };
};

// Helper function to extract country from location string
const extractCountryFromLocation = (location) => {
  if (!location) return null;
  
  // Simple extraction - you might want to use a more sophisticated approach
  // This assumes location format like "City, Country" or just "Country"
  const parts = location.split(',').map(part => part.trim());
  return parts[parts.length - 1]; // Return the last part as country
};

export default useAchievements;