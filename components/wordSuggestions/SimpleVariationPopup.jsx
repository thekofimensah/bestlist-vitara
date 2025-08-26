import React, { useEffect, useState, useRef } from 'react';

// Simpler variation popup that renders directly without portal
const SimpleVariationPopup = ({ isOpen, anchorRect, word, variations, onSelect, onClose, hasActiveTouch }) => {
  const [hoverKey, setHoverKey] = useState(null);
  const isActiveDragRef = useRef(false);
  const globalTouchHandlerRef = useRef(null);
  const lastHapticKey = useRef(null); // Track last haptic to prevent rapid fire
  const currentHoverKeyRef = useRef(null); // Ref to track current selection for touch end

  // Reset drag state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      isActiveDragRef.current = hasActiveTouch; // Start active if touch is ongoing
      setHoverKey(null);
      currentHoverKeyRef.current = null; // Reset selection tracking
      lastHapticKey.current = null; // Reset haptic tracking
      
      if (hasActiveTouch) {
        try { console.log('🔄 [SimpleVariationPopup] Opening with active touch - listening globally'); } catch {}
        
        // Set up global touch handlers to capture ongoing touches
        const centerX = anchorRect ? anchorRect.left + anchorRect.width / 2 : window.innerWidth / 2;
        const centerY = anchorRect ? anchorRect.top + anchorRect.height / 2 : window.innerHeight / 2;
        
        const { enhanced, opposite, synonyms = [] } = variations || {};
        const left = synonyms[0] || null;
        const right = synonyms[1] || null;
        
        const handleGlobalTouchMove = (e) => {
          if (!isActiveDragRef.current) return;
          
          const touch = e.touches[0];
          if (!touch) return;
          
          const x = touch.clientX;
          const y = touch.clientY;
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          let key = null;
          
          // Exit if too far from center (beyond the circle boundary)
          if (distance > 150) {
            key = 'exit';
          } else if (distance > 8) {
            // Find closest positioned word
            let closestWord = null;
            let closestDistance = Infinity;
            
            wordPositions.forEach(pos => {
              const wordDx = x - pos.x;
              const wordDy = y - pos.y;
              const wordDistance = Math.sqrt(wordDx * wordDx + wordDy * wordDy);
              
              // Reasonable activation radius for circular layout
              if (wordDistance < closestDistance && wordDistance < 50) {
                closestDistance = wordDistance;
                closestWord = pos;
              }
            });
            
            if (closestWord) {
              key = closestWord.type;
            }
          }
          
          try { console.log('🌐 [SimpleVariationPopup] Global drag', JSON.stringify({ x, y, dx, dy, distance, key }, null, 2)); } catch {}
          
          // Add haptic feedback when selection changes (debounced)
          if (key !== hoverKey && key !== null && key !== lastHapticKey.current) {
            if (navigator.vibrate) {
              navigator.vibrate(5); // Very subtle, only on actual change
              lastHapticKey.current = key; // Remember this to prevent rapid fire
            }
          }
          
          setHoverKey(key);
          currentHoverKeyRef.current = key; // Keep ref in sync for touch end
        };
        
        const handleGlobalTouchEnd = (e) => {
          const currentKey = currentHoverKeyRef.current; // Use ref instead of state
          try { 
            console.log('🌐 [SimpleVariationPopup] Global touch end', { 
              currentKey,
              enhanced,
              opposite,
              left,
              right,
              hasOnSelect: !!onSelect,
              hasOnClose: !!onClose
            }); 
          } catch {}
          isActiveDragRef.current = false;
          
          if (!currentKey) {
            try { console.log('🎯 [SimpleVariationPopup] No direction - selecting original word'); } catch {}
            onSelect?.(word); // Select the original word if no direction chosen
            return;
          }
          
          if (currentKey === 'exit') {
            try { console.log('🚪 [SimpleVariationPopup] Exit distance reached - closing'); } catch {}
            onClose?.();
            return;
          }
          
          // Find the chosen word from positioned words
          const chosenWord = wordPositions.find(pos => pos.type === currentKey);
          const chosen = chosenWord?.text;
          setHoverKey(null);
          
          if (chosen) {
            try { 
              console.log('✅ [SimpleVariationPopup] Calling onSelect', { 
                key: currentKey, 
                chosen,
                onSelectType: typeof onSelect
              }); 
            } catch {}
            onSelect?.(chosen);
          } else {
            try { 
              console.log('❌ [SimpleVariationPopup] No valid choice', { 
                key: currentKey, 
                mapKeys: Object.keys(map),
                mapValues: Object.values(map)
              }); 
            } catch {}
            onClose?.();
          }
        };
        
        // Add global listeners
        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
        
        globalTouchHandlerRef.current = () => {
          document.removeEventListener('touchmove', handleGlobalTouchMove);
          document.removeEventListener('touchend', handleGlobalTouchEnd);
        };
      }
    } else {
      // Reset all state when closing
      isActiveDragRef.current = false;
      setHoverKey(null);
      currentHoverKeyRef.current = null;
      lastHapticKey.current = null;
      
      // Clean up global handlers
      if (globalTouchHandlerRef.current) {
        globalTouchHandlerRef.current();
        globalTouchHandlerRef.current = null;
      }
    }
    
    try {
      console.log('🎪 [SimpleVariationPopup] Render state', JSON.stringify({
        isOpen,
        word,
        hasVariations: !!variations,
        anchorRect: anchorRect ? 'present' : 'missing',
        hasActiveTouch
      }, null, 2));
    } catch {}
  }, [isOpen, word, variations, anchorRect, hasActiveTouch, onSelect, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    
    // Prevent scrolling during popup interaction
    const preventScroll = (e) => {
      if (isActiveDragRef.current) {
        e.preventDefault();
      }
    };
    
    // Add with non-passive listeners to allow preventDefault
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('touchstart', preventScroll, { passive: false });
    
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('touchstart', preventScroll);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !variations) return null;

  try {
    console.log('🎪 [SimpleVariationPopup] Rendering', JSON.stringify({
      isOpen,
      word,
      hasVariations: !!variations,
      hasAnchorRect: !!anchorRect,
      variationsKeys: variations ? Object.keys(variations) : 'none'
    }, null, 2));
  } catch {}

  // Compact circular positioning with rectangular boxes
  const originalCenterX = anchorRect ? anchorRect.left + anchorRect.width / 2 : window.innerWidth / 2;
  const originalCenterY = anchorRect ? anchorRect.top + anchorRect.height / 2 : window.innerHeight / 2;
  
  // Calculate dynamic bubble sizes (25% smaller)
  const getWordWidth = (text) => Math.max(45, (text?.length || 0) * 7 + 24);
  
  const { original, synonyms = [], enhanced, opposite } = variations || {};
  const availableWords = [
    enhanced && { text: enhanced, type: 'enhanced' },
    synonyms[0] && { text: synonyms[0], type: 'synonym1' },
    synonyms[1] && { text: synonyms[1], type: 'synonym2' },
    opposite && { text: opposite, type: 'opposite' }
  ].filter(Boolean);
  
  // Create a tight circular arrangement
  const radius = 90; // Fixed radius for consistent spacing
  const startAngle = -90; // Start at top
  const angleStep = availableWords.length > 1 ? 360 / availableWords.length : 0;
  
  const initialWordPositions = availableWords.map((word, index) => {
    const angle = startAngle + (index * angleStep);
    const radians = (angle * Math.PI) / 180;
    const x = originalCenterX + Math.cos(radians) * radius;
    const y = originalCenterY + Math.sin(radians) * radius;
    
    return {
      ...word,
      x,
      y,
      width: getWordWidth(word.text)
    };
  });
  
  // Smart positioning to keep all words on screen
  const margin = 20;
  let adjustedCenterX = originalCenterX;
  let adjustedCenterY = originalCenterY;
  
  // Check if any words would go off screen and adjust center accordingly
  const worstX = Math.max(
    ...initialWordPositions.map(pos => pos.x + pos.width / 2),
    originalCenterX + getWordWidth(original) / 2
  );
  const bestX = Math.min(
    ...initialWordPositions.map(pos => pos.x - pos.width / 2),
    originalCenterX - getWordWidth(original) / 2
  );
  const worstY = Math.max(
    ...initialWordPositions.map(pos => pos.y + 17), // Half button height
    originalCenterY + 17
  );
  const bestY = Math.min(
    ...initialWordPositions.map(pos => pos.y - 17),
    originalCenterY - 17
  );
  
  // Adjust center to keep everything on screen
  if (worstX > window.innerWidth - margin) {
    adjustedCenterX = originalCenterX - (worstX - (window.innerWidth - margin));
  }
  if (bestX < margin) {
    adjustedCenterX = originalCenterX + (margin - bestX);
  }
  if (worstY > window.innerHeight - margin) {
    adjustedCenterY = originalCenterY - (worstY - (window.innerHeight - margin));
  }
  if (bestY < margin) {
    adjustedCenterY = originalCenterY + (margin - bestY);
  }
  
  // Recalculate positions with adjusted center
  const wordPositions = availableWords.map((word, index) => {
    const angle = startAngle + (index * angleStep);
    const radians = (angle * Math.PI) / 180;
    const x = adjustedCenterX + Math.cos(radians) * radius;
    const y = adjustedCenterY + Math.sin(radians) * radius;
    
    return {
      ...word,
      x,
      y,
      width: getWordWidth(word.text)
    };
  });
  
  const centerX = adjustedCenterX;
  const centerY = adjustedCenterY;
  const centerWidth = getWordWidth(original);

  const bubble = (label, key, position) => {
    const isHover = hoverKey === key;
    return (
      <button
        key={key}
        onClick={() => onSelect?.(label)}
        onMouseEnter={() => setHoverKey(key)}
        onMouseLeave={() => setHoverKey(null)}
        onTouchStart={() => setHoverKey(key)}
        onTouchEnd={() => setHoverKey(null)}
        className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shadow-sm border ${
          isHover 
            ? 'bg-teal-600 text-white border-teal-700/30 scale-105' 
            : 'bg-white border-gray-200 text-gray-700 scale-100'
        }`}
        style={{ 
          minHeight: 33, // 25% smaller (was 44)
          minWidth: position?.width || Math.max(45, label.length * 7 + 24),
          transform: isHover ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.1s ease-out'
        }}
      >
        {label}
      </button>
    );
  };

  // Use the already declared variables from above
  const left = synonyms[0] || null;
  const right = synonyms[1] || null;

  return (
    <div 
      className="fixed inset-0 pointer-events-auto"
      style={{ 
        zIndex: 10050,
        backgroundColor: 'rgba(0,0,0,0.4)'
      }}
    >
      {/* Dim background */}
      <div 
        className="absolute inset-0" 
        onClick={() => { 
          try { console.log('🕳️ [SimpleVariationPopup] backdrop click'); } catch {} 
          onClose?.(); 
        }} 
      />

      {/* Bubbles around the center with hold-and-drag select */}
      <div className="absolute inset-0">
        {/* Center word */}
        <div
          className="absolute pointer-events-none"
          style={{ left: centerX, top: centerY, transform: 'translate(-50%, -50%)' }}
        >
          <div 
            className={`px-3 py-2 rounded-xl text-xs font-medium shadow-sm border ${
              hoverKey ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-white text-gray-700 border-gray-200'
            }`}
            style={{ 
              minHeight: 33,
              minWidth: centerWidth,
              transition: 'all 0.1s ease-out'
            }}
          >
            {word}
          </div>
        </div>

        {/* Dynamically positioned words in circular arrangement */}
        {wordPositions.map((pos, index) => (
          <div 
            key={pos.type}
            className="absolute pointer-events-auto" 
            style={{ 
              left: pos.x, 
              top: pos.y, 
              transform: 'translate(-50%, -50%)' 
            }}
          >
            {bubble(pos.text, pos.type, pos)}
          </div>
        ))}

        {/* Touch drag to select - highlight and select on lift */}
        <div
          className="absolute inset-0 pointer-events-auto"
          onTouchMove={(e) => {
            // Don't call preventDefault here - it's handled by document listener
            if (!isActiveDragRef.current) return;
            
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Require minimum movement from center before activating selection
            let key = null;
            
            // Exit if too far from center (beyond the circle boundary)
            if (distance > 150) {
              key = 'exit';
            } else if (distance > 8) {
              // Find closest positioned word
              let closestWord = null;
              let closestDistance = Infinity;
              
              wordPositions.forEach(pos => {
                const wordDx = x - pos.x;
                const wordDy = y - pos.y;
                const wordDistance = Math.sqrt(wordDx * wordDx + wordDy * wordDy);
                
                // Reasonable activation radius for circular layout
                if (wordDistance < closestDistance && wordDistance < 50) {
                  closestDistance = wordDistance;
                  closestWord = pos;
                }
              });
              
              if (closestWord) {
                key = closestWord.type;
              }
            }
            
            try { console.log('🧭 [SimpleVariationPopup] drag', JSON.stringify({ x, y, dx, dy, distance, key }, null, 2)); } catch {}
            
            // Add haptic feedback when selection changes (debounced)
            if (key !== hoverKey && key !== null && key !== lastHapticKey.current) {
              if (navigator.vibrate) {
                navigator.vibrate(5); // Very subtle, only on actual change
                lastHapticKey.current = key; // Remember this to prevent rapid fire
              }
            }
            
            setHoverKey(key);
            currentHoverKeyRef.current = key; // Keep ref in sync for touch end
          }}
          onTouchEnd={(e) => {
            // Don't call preventDefault here - handled by document listener
            isActiveDragRef.current = false;
            
            if (!hoverKey) { 
              try { console.log('🕳️ [SimpleVariationPopup] touch end - no selection, closing'); } catch {}
              onClose?.(); 
              return; 
            }
            
            const map = { enhanced, opposite, left, right };
            const chosen = map[hoverKey];
            setHoverKey(null);
            if (chosen) {
              try { console.log('🎯 [SimpleVariationPopup] chosen', JSON.stringify({ hoverKey, chosen }, null, 2)); } catch {}
              onSelect?.(chosen);
            } else {
              onClose?.();
            }
          }}
          onTouchStart={(e) => {
            // Ensure we're in active drag mode if touch starts on the overlay
            isActiveDragRef.current = true;
            try { console.log('🔄 [SimpleVariationPopup] touch start on overlay - activating drag'); } catch {}
          }}
        />
      </div>
    </div>
  );
};

export default SimpleVariationPopup;
