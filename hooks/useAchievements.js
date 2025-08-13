import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import useUserStats from './useUserStats';
import { useGlobalAchievements } from './useGlobalAchievements.jsx';

// In-memory cache for user achievements to avoid refetch on navigation
// Map<userId, Array>
const userAchievementsCache = new Map();

const useAchievements = () => {
  const { user } = useAuth();
  const { stats } = useUserStats(user?.id);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Safely get global achievements with error handling
  let globalAchievements = null;
  let showAchievement = () => {};
  try {
    globalAchievements = useGlobalAchievements();
    showAchievement = globalAchievements?.showAchievement || (() => {});
  } catch (error) {
    
  }

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

    // Serve from cache if available
    const cached = userAchievementsCache.get(userId);
    if (cached && cached.length > 0) return cached;

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
      const list = data || [];
      userAchievementsCache.set(userId, list);
      return list;
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

  // Award achievement to user (supports repeatable achievements based on database setting)
  const awardAchievement = useCallback(async (achievementId, progressData = null) => {
    if (!user?.id) return false;

    try {
      // First, get the achievement details to check if it's repeatable
      const { data: achievement, error: achievementError } = await supabase
        .from('achievements')
        .select('is_repeatable')
        .eq('id', achievementId)
        .single();

      if (achievementError) {
        console.error('Error fetching achievement details:', achievementError);
        return false;
      }

      // For repeatable achievements, increment count instead of checking if already has
      if (achievement.is_repeatable) {
        // Fetch a single existing row (do not fail if multiple or none)
        const { data: existingRows, error: fetchError } = await supabase
          .from('user_achievements')
          .select('id, count')
          .eq('user_id', user.id)
          .eq('achievement_id', achievementId)
          .limit(1);

        if (fetchError) {
          throw fetchError;
        }

        const existing = existingRows && existingRows[0] ? existingRows[0] : null;
        if (existing) {
          // Update existing count for repeatable achievement
          const { error: updateError } = await supabase
            .from('user_achievements')
            .update({
              count: existing.count + 1,
              progress_data: progressData,
              earned_at: new Date().toISOString(), // Update the earned time
              notified_at: null // Reset notification status so it shows again
            })
            .eq('user_id', user.id)
            .eq('achievement_id', achievementId);

          if (updateError) throw updateError;
          
          // Return the updated count so the notification system can show it
          return { success: true, count: existing.count + 1 };
        }
      } else {
        // Check if user already has this achievement (non-repeatable)
        const alreadyHas = await hasAchievement(achievementId);
        if (alreadyHas) return false;
      }

      // Insert new achievement
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId,
          progress_data: progressData,
          count: 1,
          // notified_at is NULL by default, making this a pending achievement
        });

      if (error) throw error;
      return { success: true, count: 1 };
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
      const result = await awardAchievement(achievement.id);
      if (result?.success) {
        return { 
          achievement, 
          awarded: true, 
          count: result.count,
          isRepeatable: true
        };
      }
    }
    return null;
  }, [stats, awardAchievement]);

  // Check first action achievements
  const checkFirstActionAchievement = useCallback(async (achievement, actionType) => {
    const { criteria } = achievement;
    console.log('🏆 [FirstAction] Check', { achievementId: achievement.id, criteria, actionType });
    if (criteria.action === actionType) {
      const result = await awardAchievement(achievement.id);
      if (result?.success) {
        return { 
          achievement, 
          awarded: true, 
          count: result.count,
          isRepeatable: true
        };
      }
    }
    return null;
  }, [awardAchievement]);

  // Check sign-in specific achievements 
  const checkSignInAchievement = useCallback(async (achievement, context) => {
    const { criteria } = achievement;
    
    if (criteria.type === 'sign_in') {
      // Handle different sign-in achievement types
      switch (criteria.trigger) {
        case 'first_sign_in':
          // Award on first sign-in
          const result = await awardAchievement(achievement.id, context);
          if (result?.success) {
            return { 
              achievement, 
              awarded: true, 
              count: result.count,
              isRepeatable: true
            };
          }
          break;
        
        case 'daily_sign_in':
          // Check for consecutive day sign-ins (streak logic could be added here)
          // For now, just award for any sign-in
          const dailyResult = await awardAchievement(achievement.id, context);
          if (dailyResult?.success) {
            return { 
              achievement, 
              awarded: true, 
              count: dailyResult.count,
              isRepeatable: true
            };
          }
          break;
        
        default:
          // Generic sign-in achievement
          const genericResult = await awardAchievement(achievement.id, context);
          if (genericResult?.success) {
            return { 
              achievement, 
              awarded: true, 
              count: genericResult.count,
              isRepeatable: true
            };
          }
          break;
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
      const sanitize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const isLikelyPackagedProduct = () => {
        // Must have a brand to be considered a real product
        const brand = context.ai_brand; // Only AI-detected brand qualifies
        if (!brand || sanitize(brand).length < 2) return false;
        // Heuristics to exclude dishes/meals
        const name = sanitize(context.ai_product_name || context.product_name);
        const dishWords = ['plate', 'bowl', 'soup', 'salad', 'pizza', 'pasta', 'ravioli', 'ramen', 'steak', 'sandwich'];
        if (dishWords.some((w) => name.includes(` ${w} `) || name.endsWith(` ${w}`) || name.startsWith(`${w} `))) {
          return false;
        }
        return true;
      };
      
      if (criteria.scope === 'product' && context.ai_product_name) {
        // Check if anyone else has the same AI-identified packaged product
        // Only consider packaged products with a brand
        const minConfidenceOk = typeof context.ai_confidence === 'number' ? context.ai_confidence >= 0.6 : true;
        if (!isLikelyPackagedProduct() || !minConfidenceOk || context.user_product_name) {
          console.log('🏆 [GlobalFirst/Product] Skipping due to validation', {
            isLikelyPackaged: isLikelyPackagedProduct(),
            minConfidenceOk,
            hasUserProductName: !!context.user_product_name
          });
          // Skip if no AI product name or if user entered their own name
          return null;
        }
        
        // Check if this product (brand + normalized name) exists ANYWHERE already
        const normalizedName = sanitize(context.ai_product_name);
        const brand = (context.ai_brand || '').trim(); // Only AI brand qualifies
        console.log('🏆 [GlobalFirst/Product] Search tokens', { brand, normalizedName, rawName: context.ai_product_name });
        query = supabase
          .from('items')
          .select('id')
          .ilike('ai_product_name', `%${normalizedName}%`)
          .eq('ai_brand', brand)
          .not('image_url', 'is', null);
      } else if (criteria.scope === 'country' && context.location) {
        // For "first picture in new country" - check if THIS user has photographed in this country before
        const country = extractCountryFromLocation(context.location);
        console.log('🏆 [GlobalFirst/Country] Tokens', { raw: context.location, country });
        if (!country) return null;
        
        // Get this user's lists
        const { data: userLists, error: listsError } = await supabase
          .from('lists')
          .select('id')
          .eq('user_id', user.id);
          
        if (listsError) throw listsError;
        if (!userLists || userLists.length === 0) {
          // User has no lists yet, so this is definitely their first photo in any country
          const result = await awardAchievement(achievement.id, { context });
          if (result?.success) {
            return { 
              achievement, 
              awarded: true, 
              isGlobalFirst: false, // This is personal first, not global
              count: result.count,
              isRepeatable: true
            };
          }
          return null;
        }
        
        const userListIds = userLists.map(list => list.id);
        console.log('🏆 [GlobalFirst/Country] Lists in scope', userListIds.length);
        
        // Check if THIS user has any items from this country already
        console.log('🏆 [GlobalFirst/Country] Query location ILIKE', `%${country}%`);
        query = supabase
          .from('items')
          .select('id')
          .ilike('location', `%${country}%`)
          .not('image_url', 'is', null)
          .in('list_id', userListIds); //remove this .in('list_id', userListIds) filter to check across all users. if you want to change in the future. currently current user only
      }

      if (!query) return null;

      const { data, error } = await query.limit(1);
      if (error) {
        console.error('🏆 [GlobalFirst] Query error', error);
        throw error;
      }
      console.log('🏆 [GlobalFirst] Query result rows', Array.isArray(data) ? data.length : 0);

      // If user hasn't done this action before, award the achievement
      if (!data || data.length === 0) {
        const result = await awardAchievement(achievement.id, { context });
        if (result?.success) {
          return { 
            achievement, 
            awarded: true, 
            isGlobalFirst: criteria.scope === 'global', // Only global scope is truly "global first"
            count: result.count,
            isRepeatable: true
          };
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
      let newAchievements = [];

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
          
          case 'sign_in':
            result = await checkSignInAchievement(achievement, context);
            break;
          
          // Add more types as needed (streak, rating_diversity, etc.)
          default:
            break;
        }

        if (result) {
          newAchievements.push(result);
        }
      }

      // Priority: if a first_action achievement is present, suppress global_first from the same batch
      const hasFirstAction = newAchievements.some(a => a?.achievement?.criteria?.type === 'first_action');
      if (hasFirstAction) {
        newAchievements = newAchievements.filter(a => a?.achievement?.criteria?.type !== 'global_first');
      }

      // Now trigger notifications in order
      newAchievements.forEach(result => {
        showAchievement({
          achievement: result.achievement,
          isGlobalFirst: result.isGlobalFirst || false,
          count: result.count || 1,
          isRepeatable: result.isRepeatable || false
        });
      });

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

  // Function to remove achievement (for when users don't save items)
  const removeAchievement = useCallback(async (achievementId, context = {}) => {
    if (!user?.id) return false;
    
    try {
      // Only remove if it was awarded in the current session and user hasn't saved the item
      const { error } = await supabase
        .from('user_achievements')
        .delete()
        .eq('user_id', user.id)
        .eq('achievement_id', achievementId)
        .is('notified_at', null); // Only remove unnotified achievements (recently awarded)
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing achievement:', error.message);
      return false;
    }
  }, [user?.id]);

  return {
    checkAchievements,
    getUserAchievements,
    getAchievements,
    hasAchievement,
    removeAchievement,
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