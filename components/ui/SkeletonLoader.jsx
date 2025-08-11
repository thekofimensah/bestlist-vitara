import React from 'react';

// Modern skeleton loader with wave animation
export const FeedSkeleton = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={`feed-skeleton-${i}`} className="bg-white mb-4 shadow-sm overflow-hidden relative">
        {/* Wave animation overlay */}
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 mb-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded mb-1 w-24 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <div className="px-4 mb-2">
          <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
        </div>

        {/* Description */}
        <div className="px-4 mb-3 space-y-1">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
        </div>

        {/* Image */}
        <div className="w-full aspect-square bg-gray-200 mb-3 animate-pulse" />

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-6 h-6 bg-gray-200 rounded ml-auto animate-pulse" />
        </div>

        {/* Footer */}
        <div className="px-4 pb-3 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

export const ProfileGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={`profile-skeleton-${i}`} className="space-y-2 relative overflow-hidden">
        {/* Wave animation overlay */}
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent z-10"></div>
        
        <div className="w-full aspect-square bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
      </div>
    ))}
  </div>
);

export const ProfileHeaderSkeleton = () => (
  <div className="p-1 relative overflow-hidden">
    {/* Wave animation overlay */}
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>
    
    <div className="grid grid-cols-[auto,1fr] gap-4 items-start">
      {/* Avatar */}
      <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse" />
      
      {/* Info */}
      <div className="min-w-0 space-y-3">
        <div className="space-y-1">
          <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-[320px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-8 bg-gray-200 rounded w-12 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const AchievementsSkeleton = ({ count = 10 }) => (
  <div className="grid grid-cols-5 gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={`achievement-skeleton-${i}`} className="flex flex-col items-center relative overflow-hidden">
        {/* Wave animation overlay */}
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent z-10"></div>
        
        <div className="w-14 h-14 rounded-xl bg-gray-200 animate-pulse" />
        <div className="mt-1 h-3 bg-gray-200 rounded w-10 animate-pulse" />
      </div>
    ))}
  </div>
);

// Compact skeletons for better performance
export const CompactPostSkeleton = () => (
  <div className="bg-white mb-4 shadow-sm overflow-hidden animate-pulse">
    <div className="flex items-center gap-3 px-4 pt-4 mb-3">
      <div className="w-8 h-8 rounded-full bg-gray-200" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded mb-1 w-24" />
        <div className="h-3 bg-gray-200 rounded w-16" />
      </div>
      <div className="h-4 w-16 bg-gray-200 rounded" />
    </div>
    <div className="px-4 mb-2">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
    </div>
    <div className="w-full aspect-square bg-gray-200 mb-3" />
    <div className="px-4 pb-3">
      <div className="h-3 bg-gray-200 rounded w-16" />
    </div>
  </div>
);

export const LoadingPulse = ({ className = "w-4 h-4" }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// Add shimmer animation to global CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
  .animate-shimmer {
    animation: shimmer 1.5s infinite;
  }
`;
document.head.appendChild(style);
