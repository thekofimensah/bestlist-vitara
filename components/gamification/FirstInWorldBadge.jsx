import React from 'react';
import { motion } from 'framer-motion';
import firstWorldIcon from '../../assets/first-world-icon.svg';
import { ShineBorder } from '@/registry/magicui/shine-border';

// First World Icon Component displaying the SVG directly to preserve colors
const FirstWorldIcon = ({ className }) => {
  return (
    <img
      src={firstWorldIcon}
      alt="First World Icon"
      className={className}
      style={{
        objectFit: 'contain'
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
    // Use default text colors for all rarities
    return { text: 'text-white' };
  };

  const getSizeClasses = (size) => {
    switch (size) {
      case 'small':
        return {
          container: 'inline-flex',
          badgeWrapper: 'p-0.5',
          icon: 'w-5 h-5',
          text: 'text-[8px]'
        };
      case 'large':
        return {
          container: 'inline-flex', // Let content size drive the outline
          badgeWrapper: 'p-1',
          icon: 'w-8 h-8',
          text: 'text-sm'
        };
      default: // medium
        return {
          container: 'inline-flex',
          badgeWrapper: 'p-0.5',
          icon: 'w-6 h-6',
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

  // Use default colors for all rarities
  const gradientForOutline = ['#14b8a6', '#10b981'];

  const getIcon = () => {
    // Use the achievement's icon if available, otherwise default to first world icon mask
    if (achievementIcon && achievementIcon !== '🌍') {
      return <span className="text-current">{achievementIcon}</span>;
    }
    return <FirstWorldIcon className={sizes.icon} />;
  };

  const renderBasicBadge = () => (
    <ShineBorder
      className={`
        ${sizes.container}
        ${variant === 'square' ? 'rounded-lg' : 'rounded-full'}
        flex items-center justify-center
        relative ${className}
      `}
      shineColor={gradientForOutline}
      borderWidth={2}
      duration={14}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <BadgeComponent
        {...badgeProps}
        className={`flex items-center justify-center ${sizes.badgeWrapper} ${variant === 'square' ? 'rounded-lg' : 'rounded-full'} bg-white shadow-sm`}
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
        shineColor={gradientForOutline}
        borderWidth={2}
        duration={14}
      >
        <BadgeComponent {...badgeProps} className={`flex items-center justify-center rounded-full ${sizes.badgeWrapper} bg-white shadow-sm`} onClick={onClick}>
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
