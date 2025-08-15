import React from 'react';
import { motion } from 'framer-motion';

const AchievementGlow = ({ 
  achievement, 
  children, 
  className = '',
  variant = 'border', // 'border' | 'background' | 'overlay'
  intensity = 'medium' // 'subtle' | 'medium' | 'strong'
}) => {
  // More robust null checking
  if (!achievement || typeof achievement !== 'object' || !achievement.id) {
    return <div className={className}>{children}</div>;
  }

  // Debug logging for troubleshooting
  console.log('🌟 [AchievementGlow] Rendering with achievement:', achievement, 'variant:', variant, 'intensity:', intensity);
  if (achievement) {
    console.log('🌟 [AchievementGlow] Achievement details:', {
      id: achievement.id,
      name: achievement.name,
      rarity: achievement.rarity,
      isGlobalFirst: achievement.isGlobalFirst
    });
  }

  const getRarityColors = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return {
          primary: 'rgb(168, 85, 247)', // purple-500
          secondary: 'rgb(236, 72, 153)', // pink-500
          glow: 'rgba(168, 85, 247, 0.5)',
          shadow: 'rgba(168, 85, 247, 0.3)'
        };
      case 'rare':
        return {
          primary: 'rgb(59, 130, 246)', // blue-500
          secondary: 'rgb(6, 182, 212)', // cyan-500
          glow: 'rgba(59, 130, 246, 0.5)',
          shadow: 'rgba(59, 130, 246, 0.3)'
        };
      default:
        return {
          primary: 'rgb(20, 184, 166)', // teal-500
          secondary: 'rgb(34, 197, 94)', // green-500
          glow: 'rgba(20, 184, 166, 0.5)',
          shadow: 'rgba(20, 184, 166, 0.3)'
        };
    }
  };

  const getIntensityValues = (intensity) => {
    switch (intensity) {
      case 'subtle':
        return {
          borderWidth: '2px',
          shadowSize: '0 0 20px',
          glowOpacity: 0.3,
          pulseScale: [1, 1.02, 1]
        };
      case 'strong':
        return {
          borderWidth: '4px',
          shadowSize: '0 0 40px',
          glowOpacity: 0.7,
          pulseScale: [1, 1.05, 1]
        };
      default: // medium
        return {
          borderWidth: '3px',
          shadowSize: '0 0 30px',
          glowOpacity: 0.5,
          pulseScale: [1, 1.03, 1]
        };
    }
  };

  const colors = getRarityColors(achievement.rarity || 'legendary');
  const intensityVals = getIntensityValues(intensity);

  const glowStyle = {
    border: `${intensityVals.borderWidth} solid ${colors.primary}`,
    boxShadow: `${intensityVals.shadowSize} ${colors.glow}`,
    // Remove conflicting borderImage and background
  };

  const backgroundStyle = {
    background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
    boxShadow: `inset ${intensityVals.shadowSize} ${colors.glow}`,
  };

  const overlayStyle = {
    background: `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}10)`,
    backdropFilter: 'blur(1px)',
  };

  if (variant === 'border') {
    return (
      <div className={`relative ${className}`}>
        {children}
        {/* Glow effect that follows the card's exact shape with animated gradient */}
        <motion.div
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [0.98, 1.02, 0.98],
            background: [
              `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})`,
              `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})`,
              `linear-gradient(225deg, ${colors.primary}, ${colors.secondary})`,
              `linear-gradient(315deg, ${colors.secondary}, ${colors.primary})`,
              `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})`
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 pointer-events-none"
          style={{
            // Position the glow to match the card's margins and border radius
            top: '-2px',
            left: '-2px',
            right: '-2px',
            bottom: '-2px',
            borderRadius: '48px 48px 0 0', // Match the card's rounded-t-3xl
            border: `${intensityVals.borderWidth} solid transparent`,
            backgroundClip: 'border-box',
            boxShadow: `${intensityVals.shadowSize} ${colors.glow}`,
            zIndex: -1
          }}
        />
      </div>
    );
  }

  if (variant === 'background') {
    return (
      <motion.div
        animate={{
          background: [
            `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}10)`,
            `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
            `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}10)`
          ]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={backgroundStyle}
        className={`relative ${className}`}
      >
        {children}
      </motion.div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={`relative ${className}`}>
        {children}
        <motion.div
          animate={{
            opacity: [intensityVals.glowOpacity * 0.5, intensityVals.glowOpacity, intensityVals.glowOpacity * 0.5]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={overlayStyle}
          className="absolute inset-0 pointer-events-none"
        />
      </div>
    );
  }

  return <div className={className}>{children}</div>;
};

export default AchievementGlow;
