import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Globe, Star } from 'lucide-react';

const FirstInWorldBadge = ({ 
  achievement, 
  size = 'medium', 
  variant = 'default',
  className = '',
  showLabel = false,
  animate = true,
  onClick
}) => {
  // More robust null checking
  if (!achievement || typeof achievement !== 'object' || !achievement.id) {
    return null;
  }

  const getRarityColors = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return {
          bg: 'from-purple-500 to-pink-500',
          glow: 'shadow-purple-500/40',
          text: 'text-white',
          border: 'border-purple-400'
        };
      case 'rare':
        return {
          bg: 'from-blue-500 to-cyan-500',
          glow: 'shadow-blue-500/40',
          text: 'text-white',
          border: 'border-blue-400'
        };
      default:
        return {
          bg: 'from-teal-500 to-green-500',
          glow: 'shadow-teal-500/40',
          text: 'text-white',
          border: 'border-teal-400'
        };
    }
  };

  const getSizeClasses = (size) => {
    switch (size) {
      case 'small':
        return {
          container: 'w-5 h-5',
          icon: 'w-3 h-3',
          text: 'text-[8px]'
        };
      case 'large':
        return {
          container: 'w-10 h-10', // Bigger for the square variant
          icon: 'w-6 h-6',
          text: 'text-sm'
        };
      default: // medium
        return {
          container: 'w-6 h-6',
          icon: 'w-4 h-4',
          text: 'text-[10px]'
        };
    }
  };

  const colors = getRarityColors(achievement.rarity || 'legendary');
  const sizes = getSizeClasses(size);
  
  // Safe defaults for achievement properties
  const achievementName = achievement.name || 'First in World';
  const achievementIcon = achievement.icon || '🌍';
  const achievementRarity = achievement.rarity || 'legendary';

  const BadgeComponent = animate ? motion.div : 'div';
  const badgeProps = animate ? {
    animate: { 
      scale: [1, 1.1, 1]
      // Removed rotation animation - just pulsing scale
    },
    transition: { 
      duration: 2, 
      repeat: Infinity, 
      ease: 'easeInOut' 
    }
  } : {};

  const getIcon = () => {
    // Use the achievement's icon if available, otherwise default to Globe
    if (achievementIcon && achievementIcon !== '🌍') {
      return <span className="text-current">{achievementIcon}</span>;
    }
    return <Globe className={sizes.icon} />;
  };

  const renderBasicBadge = () => (
    <BadgeComponent
      {...badgeProps}
      className={`
        ${sizes.container}
        bg-gradient-to-br ${colors.bg}
        ${variant === 'square' ? 'rounded-lg' : 'rounded-full'}
        flex items-center justify-center
        ${animate ? `shadow-lg ${colors.glow}` : 'shadow-md'}
        border-2 ${colors.border}
        relative
        ${className}
      `}
      title={`${achievementName} - First in World Achievement`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {getIcon()}
      
      {/* Sparkle effect for legendary - removed rotation, just gentle fade */}
      {achievementRarity === 'legendary' && animate && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-0.5 -right-0.5"
        >
          <Star className="w-2 h-2 text-yellow-300" fill="currentColor" />
        </motion.div>
      )}
    </BadgeComponent>
  );

  const renderBadgeWithLabel = () => (
    <div className={`flex items-center gap-2 ${className}`}>
      {renderBasicBadge()}
      <div className="flex flex-col">
        <span className={`${sizes.text} font-bold ${colors.text} drop-shadow-sm`}>
          FIRST IN WORLD
        </span>
        <span className={`${sizes.text} opacity-80 ${colors.text}`}>
          {achievementName}
        </span>
      </div>
    </div>
  );

  const renderFloatingBadge = () => (
    <BadgeComponent
      {...badgeProps}
      className={`
        absolute top-2 right-2 z-10
        ${sizes.container}
        bg-gradient-to-br ${colors.bg}
        rounded-full
        flex items-center justify-center
        ${animate ? `shadow-lg ${colors.glow}` : 'shadow-md'}
        border-2 ${colors.border}
        ${className}
      `}
      title={`${achievementName} - First in World Achievement`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'hover:scale-105' }}
    >
      {getIcon()}
      
      {/* Pulse effect for floating badges */}
      {animate && (
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          }}
          className={`
            absolute inset-0 
            bg-gradient-to-br ${colors.bg} 
            rounded-full 
            -z-10
          `}
        />
      )}
      
      {/* Sparkle effect for legendary floating badges - removed rotation, just gentle fade */}
      {achievementRarity === 'legendary' && animate && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1 -right-1"
        >
          <Star className="w-3 h-3 text-yellow-300" fill="currentColor" />
        </motion.div>
      )}
    </BadgeComponent>
  );

  switch (variant) {
    case 'floating':
      return renderFloatingBadge();
    case 'withLabel':
      return renderBadgeWithLabel();
    case 'square':
      return renderBasicBadge(); // Same as default but with square styling applied above
    default:
      return renderBasicBadge();
  }
};

export default FirstInWorldBadge;
