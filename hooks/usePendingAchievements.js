import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGlobalAchievements } from './useGlobalAchievements';

/**
 * Hook to manage pending (unnotified) achievements
 * Loads pending achievements on sign-in and shows notifications
 */
const usePendingAchievements = (userId) => {
  const [pendingAchievements, setPendingAchievements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showAchievement } = useGlobalAchievements();

  // Load pending achievements for user
  const loadPendingAchievements = async (userId) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🏆 [Pending] Loading pending achievements for user:', userId);
      
      const { data, error } = await supabase
        .rpc('get_pending_achievements', { user_id_param: userId });

      if (error) {
        throw error;
      }

      console.log('🏆 [Pending] Found pending achievements:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('🏆 [Pending] Achievement details:', data.map(a => ({
          name: a.achievement_name,
          rarity: a.achievement_rarity,
          count: a.count,
          earned_at: a.earned_at
        })));
      }

      setPendingAchievements(data || []);
      return data || [];

    } catch (error) {
      console.error('❌ [Pending] Error loading pending achievements:', JSON.stringify({
        message: error.message,
        name: error.name,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      setError(error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Show pending achievements with delays (do NOT auto-mark as notified here)
  const showPendingAchievements = async (achievements) => {
    if (!achievements || achievements.length === 0) return;

    console.log('🏆 [Pending] Showing', achievements.length, 'pending achievements');

    // Sort by rarity (legendary first, then rare, then common)
    const sortedAchievements = [...achievements].sort((a, b) => {
      const rarityOrder = { legendary: 3, rare: 2, common: 1 };
      return (rarityOrder[b.achievement_rarity] || 0) - (rarityOrder[a.achievement_rarity] || 0);
    });

    // Show achievements with increasing delays
    for (let i = 0; i < sortedAchievements.length; i++) {
      const achievement = sortedAchievements[i];
      
      setTimeout(() => {
        console.log('🏆 [Pending] Showing achievement:', achievement.achievement_name);
        
        showAchievement({
          achievement: {
            id: achievement.achievement_id,
            name: achievement.achievement_name,
            description: achievement.achievement_description,
            icon: achievement.achievement_icon,
            rarity: achievement.achievement_rarity,
            category: achievement.achievement_category
          },
          awarded: true,
          isGlobalFirst: achievement.is_global_first,
          count: achievement.count,
          earnedAt: achievement.earned_at
        });
      }, 1000 + (i * 2500)); // First at 1s, then every 2.5s
    }

    // Do not auto-mark as notified here; caller decides when to mark as seen
  };

  // Mark achievements as notified
  const markAsNotified = async (achievementIds) => {
    if (!userId || !achievementIds || achievementIds.length === 0) return;

    try {
      console.log('🏆 [Pending] Marking achievements as notified:', achievementIds);
      
      const { error } = await supabase
        .rpc('mark_achievements_notified', {
          user_id_param: userId,
          achievement_ids: achievementIds
        });

      if (error) {
        throw error;
      }

      // Update local state
      setPendingAchievements(prev => 
        prev.filter(a => !achievementIds.includes(a.achievement_id))
      );

      console.log('✅ [Pending] Achievements marked as notified');

    } catch (error) {
      console.error('❌ [Pending] Error marking achievements as notified:', JSON.stringify({
        message: error.message,
        name: error.name,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
    }
  };

  // Load pending achievements when user changes
  useEffect(() => {
    if (userId) {
      loadPendingAchievements(userId);
    } else {
      setPendingAchievements([]);
      setError(null);
    }
  }, [userId]);

  return {
    pendingAchievements,
    loading,
    error,
    loadPendingAchievements,
    showPendingAchievements,
    markAsNotified
  };
};

export default usePendingAchievements;