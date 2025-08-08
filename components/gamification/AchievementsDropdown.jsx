import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';

const formatPrettyDate = (value) => {
  if (!value) return '';
  const dt = new Date(value);
  const month = dt.toLocaleString('en-US', { month: 'short' });
  return `${month}. ${dt.getDate()}, ${dt.getFullYear()}`;
};

const AchievementRow = ({ achievement }) => {
  const date = achievement.earned_at || achievement.earnedAt;
  const count = achievement.count || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative p-[2px] rounded-xl"
    >
      <motion.div
        className="rounded-xl"
        style={{ background: 'linear-gradient(90deg, #14b8a6, #60a5fa, #a78bfa, #14b8a6)' }}
        animate={{ backgroundPositionX: ['0%', '200%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      >
        <div className="rounded-xl bg-white p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{achievement.achievements?.name || achievement.name}</p>
              {count > 1 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">x{count}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{achievement.achievements?.description || achievement.description}</p>
            {date && (
              <p className="text-[10px] text-gray-400 mt-0.5">{formatPrettyDate(date)}</p>
            )}
          </div>
          {achievement.achievements?.rarity && (
            <span className="text-[10px] uppercase text-gray-500">{achievement.achievements.rarity || achievement.rarity}</span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AchievementsDropdown = ({ isOpen, onClose, achievements = [] }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-20 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="dialog"
            aria-label="Achievements"
            className="fixed left-1/2 -translate-x-1/2 top-16 w-[440px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-teal-700" />
                <h3 className="text-base font-semibold text-gray-900">Achievements</h3>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full" aria-label="Close achievements">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto space-y-2 p-2">
              {achievements && achievements.length > 0 ? (
                achievements.map((a) => <AchievementRow key={`${a.id || a.achievement_id}-${a.earned_at || a.earnedAt}`} achievement={a} />)
              ) : (
                <div className="p-10 text-center">
                  <div className="text-sm text-gray-600 mb-1">No achievements yet</div>
                  <div className="text-xs text-gray-400">Keep exploring and you’ll unlock some!</div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AchievementsDropdown;


