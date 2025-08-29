import React, { useState, useMemo } from 'react';
import SuggestionButton from './SuggestionButton';

const HorizontalSuggestions = React.memo(({ suggestions, onTap, onGetButtonRect }) => {
  const [showMore, setShowMore] = useState(false);
  
  // Split suggestions between rows based on showMore state
  const [firstRow, secondRow] = useMemo(() => {
    if (!showMore) {
      // When collapsed, all suggestions in first row
      return [suggestions, []];
    }
    // When expanded, split evenly between rows
    const midpoint = Math.ceil(suggestions.length / 2);
    return [
      suggestions.slice(0, midpoint),
      suggestions.slice(midpoint)
    ];
  }, [suggestions, showMore]);

  return (
    <div className="w-full">

      {/* Main scrollable container */}
      <div 
        className="overflow-x-auto no-scrollbar" 
        style={{ 
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          overscrollBehaviorX: 'contain'
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
                onTap={(suggestion, buttonRect) => onTap(suggestion, buttonRect)}
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
                    onTap={(suggestion, buttonRect) => onTap(suggestion, buttonRect)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Show more/less button */}
      {suggestions.length > 4 && (
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


