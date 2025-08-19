import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Globe, Star } from 'lucide-react';

// Custom First in World Icon Component
const CustomFirstInWorldIcon = ({ className, rarity }) => {
  // Generate unique IDs for each gradient to avoid conflicts
  const gradientId = `earth-gradient-${rarity}-${Math.random().toString(36).substr(2, 9)}`;
  
  const getStrokeColor = () => `url(#${gradientId})`;
  
  const getGradientColors = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return { start: '#a855f7', end: '#ec4899' }; // purple to pink
      case 'rare':
        return { start: '#3b82f6', end: '#06b6d4' }; // blue to cyan
      default:
        return { start: '#14b8a6', end: '#10b981' }; // teal to green
    }
  };

  const colors = getGradientColors(rarity);

  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>
      {/* Main earth circle - colorful border, transparent fill */}
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M12 19.5047C16.1448 19.5047 19.5047 16.1447 19.5047 12C19.5047 7.85526 16.1448 4.4953 12 4.4953C7.85532 4.4953 4.49536 7.85526 4.49536 12C4.49536 16.1447 7.85532 19.5047 12 19.5047Z" 
        stroke={getStrokeColor()} 
        strokeWidth="1.5"
        fill="transparent"
      />
      {/* Left continent - colorful border, transparent fill */}
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M8.71733 14.5015C9.02546 14.5015 9.3164 14.3595 9.50599 14.1166C9.69559 13.8737 9.76271 13.557 9.68794 13.2581L9.18762 11.2568C9.07622 10.8115 8.67608 10.4991 8.21702 10.499H4.64612C4.08352 13.2627 5.11851 16.1084 7.32513 17.865L7.99755 14.5015H8.71733Z" 
        stroke={getStrokeColor()} 
        strokeWidth="1.5"
        fill="transparent"
      />
      {/* Right continent - colorful border, transparent fill */}
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M17.9938 7.49719H15.2828C14.8238 7.49724 14.4236 7.80966 14.3122 8.255L13.8119 10.2562C13.7371 10.5552 13.8042 10.8719 13.9938 11.1148C14.1834 11.3577 14.4744 11.4997 14.7825 11.4997H15.8358L16.3635 14.6683C16.444 15.1508 16.8616 15.5043 17.3508 15.5042H18.6349C19.9953 12.9381 19.7453 9.8161 17.9938 7.49919V7.49719Z" 
        stroke={getStrokeColor()} 
        strokeWidth="1.5"
        fill="transparent"
      />
    </svg>
  );
};

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
    // Use the achievement's icon if available, otherwise default to custom icon
    if (achievementIcon && achievementIcon !== '🌍') {
      return <span className="text-current">{achievementIcon}</span>;
    }
    return <CustomFirstInWorldIcon className={sizes.icon} rarity={achievementRarity} />;
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
        absolute top-2 right-2 z-0
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
