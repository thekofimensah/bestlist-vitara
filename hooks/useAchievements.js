import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import useUserStats from './useUserStats';
import { useGlobalAchievements } from './useGlobalAchievements.jsx';
import { Preferences } from '@capacitor/preferences';

// In-memory cache for user achievements to avoid refetch on navigation
// Map<userId, Array>
const userAchievementsCache = new Map();

// Persistent cache keys and helper functions
const USER_ACHIEVEMENTS_CACHE_KEY = 'user_achievements_cache_v1';
const ALL_ACHIEVEMENTS_CACHE_KEY = 'all_achievements_cache_v1';

// Helper functions for persistent caching
const saveUserAchievementsLocal = async (userId, achievements) => {
  try {
    const cacheData = {
      userId,
      achievements,
      timestamp: Date.now()
    };
    await Preferences.set({
      key: `${USER_ACHIEVEMENTS_CACHE_KEY}_${userId}`,
      value: JSON.stringify(cacheData)
    });
    console.log('💾 [UserAchievements] Saved to persistent cache:', achievements.length, 'achievements');
  } catch (error) {
    console.error('Error saving user achievements to persistent cache:', error);
  }
};

const getUserAchievementsLocal = async (userId) => {
  try {
    const { value } = await Preferences.get({ key: `${USER_ACHIEVEMENTS_CACHE_KEY}_${userId}` });
    if (!value) return null;
    
    const cacheData = JSON.parse(value);
    const isRecent = (Date.now() - cacheData.timestamp) < 5 * 60 * 1000; // 5 minutes
    
    if (cacheData.userId === userId && isRecent) {
      console.log('📦 [UserAchievements] Serving from persistent cache:', cacheData.achievements.length, 'achievements');
      return cacheData.achievements;
    }
    return null;
  } catch (error) {
    console.error('Error loading user achievements from persistent cache:', error);
    return null;
  }
};

const saveAllAchievementsLocal = async (achievements) => {
  try {
    const cacheData = {
      achievements,
      timestamp: Date.now()
    };
    await Preferences.set({
      key: ALL_ACHIEVEMENTS_CACHE_KEY,
      value: JSON.stringify(cacheData)
    });
    console.log('💾 [AllAchievements] Saved to persistent cache:', achievements.length, 'achievements');
  } catch (error) {
    console.error('Error saving all achievements to persistent cache:', error);
  }
};

const getAllAchievementsLocal = async () => {
  try {
    const { value } = await Preferences.get({ key: ALL_ACHIEVEMENTS_CACHE_KEY });
    if (!value) return null;
    
    const cacheData = JSON.parse(value);
    const isRecent = (Date.now() - cacheData.timestamp) < 10 * 60 * 1000; // 10 minutes
    
    if (isRecent) {
      console.log('📦 [AllAchievements] Serving from persistent cache:', cacheData.achievements.length, 'achievements');
      return cacheData.achievements;
    }
    return null;
  } catch (error) {
    console.error('Error loading all achievements from persistent cache:', error);
    return null;
  }
};

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
      // Check persistent cache first
      const cachedAchievements = await getAllAchievementsLocal();
      if (cachedAchievements) {
        return cachedAchievements;
      }

      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('active', true)
        .order('created_at');

      if (error) throw error;
      
      const achievements = data || [];
      
      // Save to persistent cache
      await saveAllAchievementsLocal(achievements);
      
      return achievements;
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

  // Get user's earned achievements with correct counts
  const getUserAchievements = useCallback(async (userId = user?.id) => {
    if (!userId) return [];

    // Check in-memory cache first
    const cached = userAchievementsCache.get(userId);
    if (cached && cached.length >= 0) {
      console.log('🚀 [UserAchievements] Using in-memory cache, count:', cached.length);
      return cached;
    }

    // Check persistent cache
    const persistentCached = await getUserAchievementsLocal(userId);
    if (persistentCached) {
      console.log('📦 [UserAchievements] Using persistent cache, count:', persistentCached.length);
      // Store in memory cache for faster subsequent access
      userAchievementsCache.set(userId, persistentCached);
      return persistentCached;
    }

    console.log('🔄 [UserAchievements] No cache found, fetching from database for user:', userId);

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
            reward_points,
            type,
            criteria
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      
      // Fix counts for STATE achievements
      const correctedList = await Promise.all((data || []).map(async (achievement) => {
        // For STATE achievements, calculate milestone count
        if (achievement.achievements?.type === 'STATE') {
          const target = achievement.achievements.criteria?.target;
          const field = achievement.achievements.criteria?.field;
          
          if (target && field) {
            // Get actual current count from progress view
            const { data: progress } = await supabase
              .from('v_user_achievement_progress')
              .select('current_count')
              .eq('user_id', userId)
              .eq('achievement_id', achievement.achievement_id)
              .single();
              
            const actualCount = progress?.current_count || 0;
            
            // Calculate how many times they've hit the milestone
            const milestoneCount = Math.floor(actualCount / target);
            
            console.log(`🏆 [getUserAchievements] ${achievement.achievements.name}: ${actualCount} items = ${milestoneCount} milestones (target: ${target})`);
            
            return {
              ...achievement,
              count: Math.max(milestoneCount, 1) // Show at least 1 if they earned it
            };
          }
        }
        
        // For EVENT achievements, use the stored count
        return achievement;
      }));
      
      // Save to both in-memory and persistent cache
      userAchievementsCache.set(userId, correctedList);
      await saveUserAchievementsLocal(userId, correctedList);
      
      return correctedList;
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

  // Get user's progress for STATE achievements (counter-based)
  const getUserProgress = useCallback(async (userId = user?.id) => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('v_user_achievement_progress')
        .select(`
          *,
          achievement_id,
          achievements!inner (
            name,
            description,
            icon,
            rarity,
            category,
            reward_points,
            type
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user progress:', JSON.stringify({
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
      // First, get the achievement details to determine the type
      const { data: achievement, error: achievementError } = await supabase
        .from('achievements')
        .select('type, criteria')
        .eq('id', achievementId)
        .single();
        
      if (achievementError) throw achievementError;
      
      // For STATE achievements (counter-based), check the progress view
      if (achievement?.type === 'STATE') {
        console.log('🔍 [hasAchievement] Checking STATE achievement via progress view:', achievementId);
        
        const { data: progress, error: progressError } = await supabase
          .from('v_user_achievement_progress')
          .select('is_earned')
          .eq('user_id', userId)
          .eq('achievement_id', achievementId)
          .single();
          
        if (progressError && progressError.code !== 'PGRST116') throw progressError;
        return progress?.is_earned || false;
      }
      
      // For first-in-world achievements, check items table instead of user_achievements
      if (achievement?.criteria?.type === 'global_first') {
        console.log('🔍 [hasAchievement] Checking first-in-world via items table for achievement:', achievementId);
        
        // Check if user has any items marked with this first-in-world achievement
        const { data: userLists } = await supabase
          .from('lists')
          .select('id')
          .eq('user_id', userId);
          
        if (!userLists || userLists.length === 0) return false;
        
        const listIds = userLists.map(list => list.id);
        const { data: items, error: itemsError } = await supabase
          .from('items')
          .select('id')
          .eq('first_in_world_achievement_id', achievementId)
          .in('list_id', listIds)
          .limit(1);
          
        if (itemsError) throw itemsError;
        return items && items.length > 0;
      }
      
      // For EVENT achievements, use user_achievements table as aggregation
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
      // First, get the achievement details to check if it's repeatable and its type
      const { data: achievement, error: achievementError } = await supabase
        .from('achievements')
        .select('type, is_repeatable, criteria')
        .eq('id', achievementId)
        .single();

      if (achievementError) {
        console.error('Error fetching achievement details:', achievementError);
        return false;
      }

      // For STATE achievements, we only log notifications, not award the achievement itself
      // The achievement is "earned" when the live count meets the target
      if (achievement.type === 'STATE') {
        console.log('🏆 [awardAchievement] STATE achievement - logging notification only:', achievementId);
        
        // Check if we've already notified the user about this threshold
        const { data: existingNotification, error: notificationError } = await supabase
          .from('user_achievements')
          .select('id, count')
          .eq('user_id', user.id)
          .eq('achievement_id', achievementId)
          .limit(1);
          
        if (notificationError && notificationError.code !== 'PGRST116') {
          throw notificationError;
        }
        
        if (existingNotification && existingNotification.length > 0) {
          // Update notification timestamp to show it was triggered again
          const { error: updateError } = await supabase
            .from('user_achievements')
            .update({
              notified_at: new Date().toISOString(),
              progress_data: progressData
            })
            .eq('user_id', user.id)
            .eq('achievement_id', achievementId);
            
          if (updateError) throw updateError;
          
          // Clear cache after successful update
          userAchievementsCache.delete(user.id);
          try {
            await Preferences.remove({ key: `${USER_ACHIEVEMENTS_CACHE_KEY}_${user.id}` });
          } catch (error) {
            console.error('Error clearing persistent cache:', error);
          }
          return { success: true, count: 1 };
        } else {
          // Insert notification record for this STATE achievement
          const { error: insertError } = await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_id: achievementId,
              progress_data: progressData,
              count: 1,
              notified_at: new Date().toISOString()
            });
            
          if (insertError) throw insertError;
          
          // Clear cache after successful insert
          userAchievementsCache.delete(user.id);
          try {
            await Preferences.remove({ key: `${USER_ACHIEVEMENTS_CACHE_KEY}_${user.id}` });
          } catch (error) {
            console.error('Error clearing persistent cache:', error);
          }
          return { success: true, count: 1 };
        }
      }

      // For EVENT achievements (traditional behavior)
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
          
          // Clear cache after successful update
          userAchievementsCache.delete(user.id);
          try {
            await Preferences.remove({ key: `${USER_ACHIEVEMENTS_CACHE_KEY}_${user.id}` });
          } catch (error) {
            console.error('Error clearing persistent cache:', error);
          }
          
          // Return the updated count so the notification system can show it
          return { success: true, count: existing.count + 1 };
        }
      } else {
        // Check if user already has this achievement (non-repeatable EVENT)
        const alreadyHas = await hasAchievement(achievementId);
        if (alreadyHas) return false;
      }

      // Insert new EVENT achievement
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
      
      // Clear cache after successful insert
      userAchievementsCache.delete(user.id);
      await saveUserAchievementsLocal(user.id, []); // Clear persistent cache
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

  // Check counter-based achievements (now using STATE system)
  const checkCounterAchievement = useCallback(async (achievement) => {
    const { criteria } = achievement;
    
    if (!user?.id) return null;
    
    try {
      // Query the progress view for this user and achievement
      const { data: progress, error: progressError } = await supabase
        .from('v_user_achievement_progress')
        .select('current_count, target, is_earned')
        .eq('user_id', user.id)
        .eq('achievement_id', achievement.id)
        .single();
        
      if (progressError && progressError.code !== 'PGRST116') {
        console.warn('Error checking counter achievement progress:', progressError);
        return null;
      }
      
      // If no progress data, user hasn't earned it yet
      if (!progress) return null;
      
      console.log(`🎯 [Counter] ${achievement.name}: ${progress.current_count}/${progress.target} (earned: ${progress.is_earned})`);
      
      // If user has reached the target, trigger notification
      if (progress.is_earned) {
        // Check if we've already notified them about this achievement
        const { data: notification, error: notificationError } = await supabase
          .from('user_achievements')
          .select('notified_at')
          .eq('user_id', user.id)
          .eq('achievement_id', achievement.id)
          .single();
          
        // Only award if they haven't been notified yet, or if it's repeatable
        if (notificationError?.code === 'PGRST116' || !notification?.notified_at) {
          const result = await awardAchievement(achievement.id, {
            current_count: progress.current_count,
            target: progress.target
          });
          
          if (result?.success) {
            return { 
              achievement, 
              awarded: true, 
              count: result.count,
              isRepeatable: achievement.is_repeatable || false
            };
          }
        }
      }
    } catch (error) {
      console.error('Error in checkCounterAchievement:', error);
    }
    
    return null;
  }, [user?.id, awardAchievement]);

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
        
        // Use full-text search for better matching of the product name, plus an exact match on the brand.
        query = supabase
          .from('items')
          .select('id')
          .textSearch('ai_product_name', `'${normalizedName}'`, {
            type: 'websearch',
            config: 'english'
          })
          .eq('ai_brand', brand)
          .not('image_url', 'is', null);
          
        // If we are checking an item that has just been saved, exclude it from its own duplicate check.
        if (context.itemId) {
          query = query.not('id', 'eq', context.itemId);
        }
          
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
      } else {
        // Unsupported scope type
        console.log('🏆 [GlobalFirst] Unsupported scope:', criteria.scope);
        return null;
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
        console.log('🏆 [GlobalFirst] No existing items found - this could be first in world!');
        console.log('🏆 [GlobalFirst] Context validation:', {
          hasItemId: !!context.itemId,
          criteriaScope: criteria.scope,
          itemId: context.itemId
        });
        
        // 🌍 CRITICAL: Update the item FIRST as the primary action
        if (context.itemId && criteria.scope === 'product') {
          try {
            console.log('🌍 [FirstInWorld] PRIMARY: Marking item as first-in-world:', context.itemId, 'Achievement ID:', achievement.id);
            const { data: updateData, error: updateError } = await supabase
              .from('items')
              .update({
                is_first_in_world: true,
                first_in_world_achievement_id: achievement.id
              })
              .eq('id', context.itemId)
              .select(); // Add select to get the updated data back
              
            if (updateError) {
              console.error('❌ [FirstInWorld] PRIMARY action failed - aborting achievement:', JSON.stringify({
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                code: updateError.code
              }));
              return null; // Don't award achievement if item update fails
            }
            
            console.log('✅ [FirstInWorld] Item successfully marked as first-in-world. Updated data:', updateData);
          } catch (itemUpdateError) {
            console.error('❌ [FirstInWorld] Item update exception - aborting:', JSON.stringify({
              message: itemUpdateError.message,
              name: itemUpdateError.name,
              details: itemUpdateError.details,
              hint: itemUpdateError.hint,
              code: itemUpdateError.code,
              fullError: itemUpdateError
            }));
            return null; // Don't award achievement if item update fails
          }
        }
        
        // SECONDARY: Award achievement to user (only if item update succeeded for product scope)
        const result = await awardAchievement(achievement.id, { context });
        if (result?.success) {
          console.log('✅ [FirstInWorld] SECONDARY: Achievement awarded to user');
          return { 
            achievement, 
            awarded: true, 
            isGlobalFirst: criteria.scope === 'product', // Only product-scope achievements get badges and special effects
            count: result.count,
            isRepeatable: true
          };
        } else {
          console.error('❌ [FirstInWorld] SECONDARY action failed - user achievement not awarded');
          // Item is already marked for product scope, which is the most important part
          return { 
            achievement, 
            awarded: false, 
            isGlobalFirst: criteria.scope === 'product', // Only product-scope achievements get badges and special effects
            count: 0,
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
    
    // Validate context for first-in-world achievements
    if (actionType === 'item_saved' && (!context.itemId || !context.ai_product_name || !context.ai_brand)) {
      console.log('⚠️ [Achievements] Missing required context for first-in-world check:', {
        hasItemId: !!context.itemId,
        hasProductName: !!context.ai_product_name,
        hasBrand: !!context.ai_brand
      });
    }
    
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

  // Clear cache when user data changes (called from other hooks when items are added/deleted)
  const clearCache = useCallback(async (userId = user?.id) => {
    if (userId) {
      userAchievementsCache.delete(userId);
      // Clear persistent cache as well
      try {
        await Preferences.remove({ key: `${USER_ACHIEVEMENTS_CACHE_KEY}_${userId}` });
        console.log('🗑️ [UserAchievements] Cleared persistent cache for user:', userId);
      } catch (error) {
        console.error('Error clearing user achievements persistent cache:', error);
      }
    }
  }, [user?.id]);



  // Check if achievements would be awarded WITHOUT actually awarding them (for glow effects)
  const previewAchievements = useCallback(async (actionType, context = {}) => {
    if (!user?.id) return [];

    try {
      const achievements = await getAchievements();
      let potentialAchievements = [];

      for (const achievement of achievements) {
        const { criteria } = achievement;
        let wouldAward = false;

        switch (criteria.type) {
          case 'global_first':
            // Use same logic as checkGlobalFirstAchievement but don't award
            wouldAward = await checkGlobalFirstAchievementPreview(achievement, context);
            break;
          
          case 'first_action':
            // Check if this would be first action without awarding
            if (criteria.action === actionType) {
              const hasIt = await hasAchievement(achievement.id);
              wouldAward = !hasIt;
            }
            break;
          
          // Add other types as needed
          default:
            break;
        }

        if (wouldAward) {
          potentialAchievements.push({
            achievement,
            awarded: false, // Not actually awarded, just preview
            isGlobalFirst: criteria.type === 'global_first',
            count: 1,
            isRepeatable: true
          });
        }
      }

      return potentialAchievements;
    } catch (error) {
      console.error('Error previewing achievements:', error);
      return [];
    }
  }, [user?.id, getAchievements, hasAchievement]);

  // Preview version of global first check (no database writes)
  const checkGlobalFirstAchievementPreview = useCallback(async (achievement, context) => {
    const { criteria } = achievement;
    
    if (criteria.type !== 'global_first') return false;

    try {
      let query;
      const sanitize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const isLikelyPackagedProduct = () => {
        const brand = context.ai_brand;
        if (!brand || sanitize(brand).length < 2) return false;
        const name = sanitize(context.ai_product_name || context.product_name);
        const dishWords = ['plate', 'bowl', 'soup', 'salad', 'pizza', 'pasta', 'ravioli', 'ramen', 'steak', 'sandwich'];
        if (dishWords.some((w) => name.includes(` ${w} `) || name.endsWith(` ${w}`) || name.startsWith(`${w} `))) {
          return false;
        }
        return true;
      };
      
      if (criteria.scope === 'product' && context.ai_product_name) {
        const minConfidenceOk = typeof context.ai_confidence === 'number' ? context.ai_confidence >= 0.6 : true;
        if (!isLikelyPackagedProduct() || !minConfidenceOk || context.user_product_name) {
          console.log('🏆 [GlobalFirst/Preview] Skipping due to validation');
          return false;
        }
        
        const normalizedName = sanitize(context.ai_product_name);
        const brand = (context.ai_brand || '').trim();
        
        query = supabase
          .from('items')
          .select('id')
          .textSearch('ai_product_name', `'${normalizedName}'`, {
            type: 'websearch',
            config: 'english'
          })
          .eq('ai_brand', brand)
          .not('image_url', 'is', null);
          
        if (context.itemId) {
          query = query.not('id', 'eq', context.itemId);
        }
      } else if (criteria.scope === 'country' && context.location) {
        // Country logic (simplified for preview)
        const country = extractCountryFromLocation(context.location);
        if (!country) return false;
        
        const { data: userLists } = await supabase
          .from('lists')
          .select('id')
          .eq('user_id', user.id);
          
        if (!userLists || userLists.length === 0) return true;
        
        const userListIds = userLists.map(list => list.id);
        query = supabase
          .from('items')
          .select('id')
          .ilike('location', `%${country}%`)
          .not('image_url', 'is', null)
          .in('list_id', userListIds);
      } else {
        // Unsupported scope type
        return false;
      }

      if (!query) return false;

      const { data, error } = await query.limit(1);
      if (error) {
        console.error('🏆 [GlobalFirst/Preview] Query error', error);
        return false;
      }

      // Return true if this would be first in world
      return !data || data.length === 0;
    } catch (error) {
      console.error('Error in global first preview:', error);
      return false;
    }
  }, [user?.id]);

  return {
    checkAchievements,
    getUserAchievements,
    getUserProgress,
    getAchievements,
    hasAchievement,
    removeAchievement,
    previewAchievements, // New function for glow effects
    clearCache,
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