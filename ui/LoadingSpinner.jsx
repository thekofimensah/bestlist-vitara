import React from 'react';

const LoadingSpinner = ({ size = 'md', color = 'teal' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5',     // ~20% larger than 4
    md: 'w-7 h-7',     // ~20% larger than 6
    lg: 'w-10 h-10',   // ~20% larger than 8
    xl: 'w-14 h-14'    // ~20% larger than 12
  };

  const colorClasses = {
    teal: 'border-teal-600',
    white: 'border-white',
    gray: 'border-gray-400'
  };

  return (
    <div className="mt-24 md:mt-32">
      <div className={`${sizeClasses[size]} ${colorClasses[color]} border-2 border-t-transparent rounded-full animate-spin`} />
    </div>
  );
};

export default LoadingSpinner; 