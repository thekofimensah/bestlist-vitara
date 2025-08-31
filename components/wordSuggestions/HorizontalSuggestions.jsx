import React, { useState, useMemo, useEffect } from 'react';
import SuggestionButton from './SuggestionButton';

const HorizontalSuggestions = React.memo(({ suggestions, onTap, onGetButtonRect, rating = 3 }) => {
  const [showMore, setShowMore] = useState(false);
  
  // Split suggestions between rows based on showMore state
  const [firstRow, secondRow] = useMemo(() => {
    if (!showMore) {
      // When collapsed, all suggestions in first row
      return [suggestions, []];
    }
    // When expanded, split between rows
    // Always try to split if showMore is true, even with few suggestions
    // This maintains the expanded state the user requested
    const midpoint = Math.ceil(suggestions.length / 2);
    return [
      suggestions.slice(0, midpoint),
      suggestions.slice(midpoint)
    ];
  }, [suggestions, showMore]);

  // Auto-collapse when second row becomes empty (but only if we were expanded)
  useEffect(() => {
    if (showMore && secondRow.length === 0) {
      setShowMore(false);
    }
  }, [showMore, secondRow.length]);

  return (
    <div className="w-full">

      {/* Main scrollable container */}
      <div 
        className="overflow-x-auto no-scrollbar" 
        style={{ 
          touchAction: 'manipulation', // Allow all touch gestures to pass through
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          pointerEvents: 'auto', // Ensure we still get pointer events for buttons
          userSelect: 'none' // Prevent text selection during scrolling
        }}
      >
        <div className="inline-block min-w-full">
          {/* Rows container with fixed width to ensure synchronized scrolling */}
          <div className="space-y-3">
            {/* First row - always visible */}
            <div className="flex gap-2 pb-1">
                          {firstRow.map((suggestion) => (
              <SuggestionButton
                key={suggestion.id}
                suggestion={suggestion}
                rating={rating}
                onTap={(tappedSuggestion, buttonRect, isDoubleTap = false) => {
                  onTap(tappedSuggestion, buttonRect, isDoubleTap);
                }}
              />
            ))}
            </div>

            {/* Second row - shown when expanded */}
            {showMore && secondRow.length > 0 && (
              <div className="flex gap-2 pb-1">
                {secondRow.map((suggestion) => (
                  <SuggestionButton
                    key={suggestion.id}
                    suggestion={suggestion}
                    rating={rating}
                    onTap={(tappedSuggestion, buttonRect, isDoubleTap = false) => {
                      onTap(tappedSuggestion, buttonRect, isDoubleTap);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Show more/less button */}
      {(suggestions.length > 4 || showMore) && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setShowMore(!showMore)}
            className="text-xs text-teal-600 font-medium px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors"
          >
            {showMore ? 'Show less' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
});

export default HorizontalSuggestions;


