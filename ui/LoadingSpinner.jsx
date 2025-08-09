import React from 'react';

const LoadingSpinner = ({ size = 'md', color = 'teal' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    teal: 'border-teal-600',
    white: 'border-white',
    gray: 'border-gray-400'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} border-2 border-t-transparent rounded-full animate-spin`} />
  );
};

export default LoadingSpinner; 