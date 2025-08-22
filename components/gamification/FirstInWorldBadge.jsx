import React from 'react';
import { motion } from 'framer-motion';
import earthIcon from '../../assets/earth-1.svg';
import { ShineBorder } from '@/registry/magicui/shine-border';

// Earth Icon Component using imported SVG
const EarthIcon = ({ className, rarity }) => {
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
    <img 
      src={earthIcon} 
      alt="Earth Icon"
      className={className}
      style={{ 
        // Apply gradient effect using CSS filters
        filter: rarity === 'legendary' ? 'hue-rotate(270deg) saturate(200%)' :
                rarity === 'rare' ? 'hue-rotate(200deg) saturate(150%)' :
                'hue-rotate(160deg) saturate(120%)'
      }}
    />
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
    // Keep text color mapping for labels only; border handled via hex colors below
    switch (rarity) {
      case 'legendary':
        return { text: 'text-white' };
      case 'rare':
        return { text: 'text-white' };
      default:
        return { text: 'text-white' };
    }
  };

  const getSizeClasses = (size) => {
    switch (size) {
      case 'small':
        return {
          container: 'w-5 h-5',
          badgeWrapper: 'w-full h-full p-0.5',
          icon: 'w-full h-full',
          text: 'text-[8px]'
        };
      case 'large':
        return {
          container: 'w-10 h-10', // Bigger for the square variant
          badgeWrapper: 'w-full h-full p-1',
          icon: 'w-full h-full',
          text: 'text-sm'
        };
      default: // medium
        return {
          container: 'w-6 h-6',
          badgeWrapper: 'w-full h-full p-0.5',
          icon: 'w-full h-full',
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
    // Use the achievement's icon if available, otherwise default to earth icon
    if (achievementIcon && achievementIcon !== '🌍') {
      return <span className="text-current">{achievementIcon}</span>;
    }
    return <EarthIcon className={sizes.icon} rarity={achievementRarity} />;
  };

  const shineColorsByRarity = {
    legendary: ['#a855f7', '#ec4899'],
    rare: ['#3b82f6', '#06b6d4'],
    default: ['#14b8a6', '#10b981'],
  };

  const renderBasicBadge = () => (
    <ShineBorder
      className={`
        ${sizes.container}
        ${variant === 'square' ? 'rounded-lg' : 'rounded-full'}
        flex items-center justify-center
        relative ${className}
      `}
      shineColor={shineColorsByRarity[achievementRarity] || shineColorsByRarity.default}
      borderWidth={2}
      duration={14}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <BadgeComponent
        {...badgeProps}
        className={`flex items-center justify-center ${sizes.badgeWrapper} ${variant === 'square' ? 'rounded-lg' : 'rounded-full'}`}
        onClick={onClick}
      >
        {getIcon()}
      </BadgeComponent>
    </ShineBorder>
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
    <div className={`absolute top-2 right-2 z-0 ${className}`}>
      <ShineBorder
        className={`
          ${sizes.container}
          rounded-full flex items-center justify-center
        `}
        shineColor={shineColorsByRarity[achievementRarity] || shineColorsByRarity.default}
        borderWidth={2}
        duration={14}
      >
        <BadgeComponent {...badgeProps} className={`flex items-center justify-center rounded-full ${sizes.badgeWrapper}`} onClick={onClick}>
          {getIcon()}
        </BadgeComponent>
      </ShineBorder>
    </div>
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
