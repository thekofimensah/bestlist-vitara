import React from 'react';
import { motion } from 'framer-motion';

// Magic UI ShineBorder-compatible API
// Props: className, duration, shineColor (string | string[]), borderWidth, style
export const ShineBorder = ({
  className = '',
  duration = 14,
  shineColor = '#000000',
  borderWidth = 2,
  style = {},
  children,
}) => {
  const colors = Array.isArray(shineColor) ? shineColor : [shineColor, shineColor];

  return (
    <div className={`relative ${className}`} style={{ ...style }}>
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          padding: borderWidth,
          borderRadius: 'inherit',
          background: `linear-gradient(90deg, ${colors.join(', ')})`,
          backgroundSize: '200% 100%',
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
        }}
        animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative rounded-[inherit]">
        {children}
      </div>
    </div>
  );
};


