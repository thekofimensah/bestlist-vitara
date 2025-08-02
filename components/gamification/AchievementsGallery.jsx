import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Lock, Calendar } from 'lucide-react';
import { useAchievements } from '../../hooks/useAchievements';
import { useAuth } from '../../hooks/useAuth';

const AchievementCard = ({ achievement, userAchievement, isLocked = false }) => {
  const getRarityStyles = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return {
          bg: 'bg-gradient-to-br from-purple-100 to-pink-100',
          border: 'border-purple-300',
          icon: 'text-purple-600',
          text: 'text-purple-900'
        };
      case 'rare':
        return {
          bg: 'bg-gradient-to-br from-blue-100 to-cyan-100',
          border: 'border-blue-300',
          icon: 'text-blue-600',
          text: 'text-blue-900'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-teal-100 to-green-100',
          border: 'border-teal-300',
          icon: 'text-teal-600',
          text: 'text-teal-900'
        };
    }
  };

  const styles = getRarityStyles(achievement.rarity);

  if (isLocked) {
    return (
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 opacity-60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-500 mb-1">???</h3>
            <p className="text-xs text-gray-400">Complete more actions to unlock</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${styles.bg} rounded-2xl p-4 border-2 ${styles.border}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 ${styles.bg} rounded-full flex items-center justify-center relative`}>
          <span className="text-2xl">{achievement.icon || '🏆'}</span>
          {achievement.rarity === 'legendary' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1 -right-1"
            >
              <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
            </motion.div>
          )}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${styles.text} mb-1`}>
            {achievement.name}
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            {achievement.description}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-xs font-medium ${styles.icon} uppercase tracking-wider`}>
            {achievement.rarity}
          </div>
          {achievement.reward_points > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              +{achievement.reward_points}pts
            </div>
          )}
        </div>
      </div>
      
      {userAchievement && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>
            Earned {new Date(userAchievement.earned_at).toLocaleDateString()}
          </span>
        </div>
      )}
    </motion.div>
  );
};

const AchievementsGallery = ({ userId }) => {
  const { user } = useAuth();
  const { getUserAchievements, getAchievements } = useAchievements();
  const [userAchievements, setUserAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        setLoading(true);
        
        const [userAchievs, allAchievs] = await Promise.all([
          getUserAchievements(userId || user?.id),
          getAchievements()
        ]);

        setUserAchievements(userAchievs);
        setAllAchievements(allAchievs);
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId || user?.id) {
      loadAchievements();
    }
  }, [userId, user?.id, getUserAchievements, getAchievements]);

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'discovery', name: 'Discovery' },
    { id: 'milestone', name: 'Milestones' },
    { id: 'quality', name: 'Quality' },
    { id: 'streak', name: 'Streaks' },
    { id: 'social', name: 'Social' }
  ];

  const filteredAchievements = selectedCategory === 'all' 
    ? allAchievements 
    : allAchievements.filter(a => a.category === selectedCategory);

  const earnedAchievementIds = new Set(userAchievements.map(ua => ua.achievement_id));
  
  const earnedCount = userAchievements.length;
  const totalCount = allAchievements.length;
  const completionPercentage = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-teal-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Achievements</h2>
            <p className="text-sm text-gray-600">
              {earnedCount} of {totalCount} unlocked ({completionPercentage}%)
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="bg-gradient-to-r from-teal-500 to-green-500 h-2 rounded-full"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="space-y-3">
        {filteredAchievements.map((achievement) => {
          const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
          const isEarned = earnedAchievementIds.has(achievement.id);
          
          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              userAchievement={userAchievement}
              isLocked={!isEarned}
            />
          );
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No achievements in this category yet</p>
        </div>
      )}
    </div>
  );
};

export default AchievementsGallery;