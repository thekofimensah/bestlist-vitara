import React, { useState, useMemo } from 'react';
import SuggestionButton from './SuggestionButton';

const HorizontalSuggestions = React.memo(({ suggestions, onTap, onLongPress }) => {
  const [showMore, setShowMore] = useState(false);
  
  // Split suggestions into two rows
  const [firstRow, secondRow] = useMemo(() => {
    const row1 = suggestions.slice(0, Math.ceil(suggestions.length / 2));
    const row2 = suggestions.slice(Math.ceil(suggestions.length / 2));
    return [row1, row2];
  }, [suggestions]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
          <svg className="w-3 h-3 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <span className="text-sm font-medium text-gray-700">Quick add</span>

      </div>

      {/* Scrollable suggestions container */}
      <div className="space-y-3">
        {/* First row - always visible */}
        <div className="overflow-x-auto no-scrollbar" style={{ touchAction: 'pan-x' }}>
          <div className="flex gap-2 pb-1" style={{ minWidth: 'fit-content' }}>
            {firstRow.map((suggestion) => (
              <SuggestionButton 
                key={suggestion.id} 
                suggestion={suggestion} 
                onTap={onTap} 
                onLongPress={onLongPress} 
              />
            ))}
          </div>
        </div>

        {/* Second row - shown when expanded */}
        {showMore && secondRow.length > 0 && (
          <div className="overflow-x-auto no-scrollbar" style={{ touchAction: 'pan-x' }}>
            <div className="flex gap-2 pb-1" style={{ minWidth: 'fit-content' }}>
              {secondRow.map((suggestion) => (
                <SuggestionButton 
                  key={suggestion.id} 
                  suggestion={suggestion} 
                  onTap={onTap} 
                  onLongPress={onLongPress} 
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Show more button at bottom right */}
      {secondRow.length > 0 && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setShowMore(!showMore)}
            className="text-xs text-purple-600 font-medium px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors"
          >
            {showMore ? 'Show less' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
});

export default HorizontalSuggestions;


