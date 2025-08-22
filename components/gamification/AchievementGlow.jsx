import React, { useLayoutEffect, useRef, useState } from 'react';
import { ShineBorder } from '@/registry/magicui/shine-border';

const AchievementGlow = ({ achievement, intensity = 'normal', className = '', children }) => {
  const borderWidthMap = { subtle: 2, normal: 4, strong: 6 };
  const colorsByRarity = {
    legendary: ['#a855f7', '#ec4899'],
    rare: ['#3b82f6', '#06b6d4'],
    default: ['#14b8a6', '#10b981'],
  };

  const contentRef = useRef(null);
  const [measuredRadius, setMeasuredRadius] = useState(null);

  // Measure the child's exact border radius so the glow hugs it perfectly
  useLayoutEffect(() => {
    const wrapper = contentRef.current;
    if (!wrapper) return;
    // Try to measure the first element child (most common case)
    const target = wrapper.firstElementChild || wrapper;
    if (!target) return;
    const styles = window.getComputedStyle(target);
    const next = {
      borderTopLeftRadius: styles.borderTopLeftRadius,
      borderTopRightRadius: styles.borderTopRightRadius,
      borderBottomRightRadius: styles.borderBottomRightRadius,
      borderBottomLeftRadius: styles.borderBottomLeftRadius,
    };
    setMeasuredRadius(next);
  }, [children]);

  // Do not render the glow until there is an achievement (prevents early outline)
  if (!achievement) {
    return (
      <div className={`relative ${className}`}>
        <div ref={contentRef}>{children}</div>
      </div>
    );
  }

  const shineColor = colorsByRarity[achievement?.rarity] || colorsByRarity.default;
  const borderWidth = borderWidthMap[intensity] ?? 4;

  // Render content first while we measure, then swap to the bordered version
  if (!measuredRadius) {
    return (
      <div className={`relative ${className}`}>
        <div ref={contentRef}>{children}</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ padding: `${borderWidth}px` }}>
      <ShineBorder
        className="relative"
        shineColor={shineColor}
        borderWidth={borderWidth}
        duration={8}
        style={{
          ...measuredRadius,
          margin: `-${borderWidth}px`,
        }}
      >
        <div 
          ref={contentRef}
          style={{
            ...measuredRadius,
            position: 'relative',
            zIndex: 1
          }}
        >
          {children}
        </div>
      </ShineBorder>
    </div>
  );
};


export default AchievementGlow;
