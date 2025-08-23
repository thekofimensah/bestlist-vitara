import React from 'react';
import { motion } from 'framer-motion';

const AchievementGlow = ({ achievement, variant = 'shadow', intensity = 'normal', className = '', children }) => {
  const isGlowing = !!achievement;

  const rarityStyles = {
    legendary: {
      shadowFrom: 'rgba(168, 85, 247, 0.6)',
      shadowTo: 'rgba(236, 72, 153, 0.6)',
      borderFrom: '#a855f7',
      borderTo: '#ec4899',
    },
    rare: {
      shadowFrom: 'rgba(59, 130, 246, 0.5)',
      shadowTo: 'rgba(6, 182, 212, 0.5)',
      borderFrom: '#3b82f6',
      borderTo: '#06b6d4',
    },
    default: {
      shadowFrom: 'rgba(13, 148, 136, 0.5)',
      shadowTo: 'rgba(16, 185, 129, 0.5)',
      borderFrom: '#0d9488',
      borderTo: '#10b981',
    },
  };

  const styles = rarityStyles[achievement?.rarity] || rarityStyles.default;
  
  const shadowIntensity = {
    subtle: '0 0 8px',
    normal: '0 0 15px',
    strong: '0 0 25px',
  };

  const borderIntensity = {
    subtle: '1px',
    normal: '2px',
    strong: '3px',
  };

  if (!isGlowing) {
    return <div className={className}>{children}</div>;
  }

  if (variant === 'border') {
    return (
      <div className={`relative ${className}`}>
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: '48px 48px 0 0', // Match AddItemModal's rounded-t-3xl
            padding: borderIntensity[intensity],
            top: `-${borderIntensity[intensity]}`,
            left: `-${borderIntensity[intensity]}`,
            right: `-${borderIntensity[intensity]}`,
            bottom: `-${borderIntensity[intensity]}`,
            zIndex: -1, // Ensure glow is behind the content
          }}
          animate={{
            backgroundImage: [
              `linear-gradient(45deg, ${styles.borderFrom}, ${styles.borderTo})`,
              `linear-gradient(135deg, ${styles.borderFrom}, ${styles.borderTo})`,
              `linear-gradient(225deg, ${styles.borderFrom}, ${styles.borderTo})`,
              `linear-gradient(315deg, ${styles.borderFrom}, ${styles.borderTo})`,
              `linear-gradient(45deg, ${styles.borderFrom}, ${styles.borderTo})`,
            ],
          }}
          transition={{
            duration: 4,
            ease: "linear",
            repeat: Infinity,
          }}
        />
        {children}
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
