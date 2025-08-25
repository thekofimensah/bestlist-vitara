import React from 'react';

/**
 * Mock Smart Image component - just renders a regular img tag with placeholder fallback
 */
const SmartImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  onClick,
  useThumbnail = true,
  size = 'thumbnail',
  lazyLoad = true,
  onLoad,
  ...props 
}) => {
  const imageUrl = src || 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=400';

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      onLoad={onLoad}
      loading={lazyLoad ? 'lazy' : 'eager'}
      {...props}
    />
  );
};

export default SmartImage;