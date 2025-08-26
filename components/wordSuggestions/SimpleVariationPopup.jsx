import React, { useEffect, useState, useRef } from 'react';

// Simpler variation popup that renders directly without portal
const SimpleVariationPopup = ({ isOpen, anchorRect, word, variations, onSelect, onClose, hasActiveTouch }) => {
  const [hoverKey, setHoverKey] = useState(null);
  const isActiveDragRef = useRef(false);
  const globalTouchHandlerRef = useRef(null);
  const lastHapticKey = useRef(null);
  const currentHoverKeyRef = useRef(null);

  // Reset drag state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      isActiveDragRef.current = hasActiveTouch;
      setHoverKey(null);
      currentHoverKeyRef.current = null;
      lastHapticKey.current = null;
      
      if (hasActiveTouch) {
        try { console.log('🔄 [SimpleVariationPopup] Opening with active touch - listening globally'); } catch {}
        
        const handleGlobalTouchMove = (e) => {
          if (!isActiveDragRef.current) return;
          
          const touch = e.touches[0];
          if (!touch) return;
          
          const x = touch.clientX;
          const y = touch.clientY;
          
          // Find closest word with generous touch areas
          let bestMatch = null;
          let closestDistance = Infinity;
          
          // Check center word
          const centerDx = x - centerPosition.x;
          const centerDy = y - centerPosition.y;
          const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
          if (centerDistance < 80) {
            bestMatch = 'original';
            closestDistance = centerDistance;
          }
          
          // Check positioned words
          positionedWords.forEach(pos => {
            const wordDx = x - pos.x;
            const wordDy = y - pos.y;
            const wordDistance = Math.sqrt(wordDx * wordDx + wordDy * wordDy);
            
            if (wordDistance < 80 && wordDistance < closestDistance) {
              closestDistance = wordDistance;
              bestMatch = pos.type;
            }
          });
          
          // Haptic feedback on selection change
          if (bestMatch !== hoverKey && bestMatch !== null && bestMatch !== lastHapticKey.current) {
            if (navigator.vibrate) {
              navigator.vibrate(5);
              lastHapticKey.current = bestMatch;
            }
          }
          
          setHoverKey(bestMatch);
          currentHoverKeyRef.current = bestMatch;
        };
        
        const handleGlobalTouchEnd = (e) => {
          const currentSelection = currentHoverKeyRef.current;
          isActiveDragRef.current = false;
          
          if (!currentSelection) {
            onClose?.();
            return;
          }
          
          if (currentSelection === 'original') {
            setHoverKey(null);
            onSelect?.(word);
            return;
          }
          
          const chosenWord = positionedWords.find(pos => pos.type === currentSelection);
          setHoverKey(null);
          
          if (chosenWord?.text) {
            onSelect?.(chosenWord.text);
          } else {
            onClose?.();
          }
        };
        
        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
        
        globalTouchHandlerRef.current = () => {
          document.removeEventListener('touchmove', handleGlobalTouchMove);
          document.removeEventListener('touchend', handleGlobalTouchEnd);
        };
      }
    } else {
      isActiveDragRef.current = false;
      setHoverKey(null);
      currentHoverKeyRef.current = null;
      lastHapticKey.current = null;
      
      if (globalTouchHandlerRef.current) {
        globalTouchHandlerRef.current();
        globalTouchHandlerRef.current = null;
      }
    }
  }, [isOpen, word, variations, anchorRect, hasActiveTouch, onSelect, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    
    const preventScroll = (e) => {
      if (isActiveDragRef.current) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('touchstart', preventScroll, { passive: false });
    
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('touchstart', preventScroll);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !variations) return null;

  // Calculate center position
  const centerX = anchorRect ? anchorRect.left + anchorRect.width / 2 : window.innerWidth / 2;
  const centerY = anchorRect ? anchorRect.top + anchorRect.height / 2 : window.innerHeight / 2;
  const centerPosition = { x: centerX, y: centerY };

  // Get available words
  const { synonyms = [], enhanced, opposite } = variations || {};
  const availableWords = [
    enhanced && { text: enhanced, type: 'enhanced' },
    synonyms[0] && { text: synonyms[0], type: 'synonym1' },
    synonyms[1] && { text: synonyms[1], type: 'synonym2' },
    opposite && { text: opposite, type: 'opposite' }
  ].filter(Boolean);

  // Pinterest-style positioning: Clean arc angled up to left or right
  const positionedWords = (() => {
    if (availableWords.length === 0) return [];

    const radius = 85; // Distance from center
    const margin = 20; // Screen edge margin
    
    // Determine preferred side (away from screen edges)
    // Always go left or right, never center-up or center-down
    const goLeft = centerX > window.innerWidth / 2;
    
    // Base angles for clean positioning - always angled up to a side
    let positions = [];
    
    if (availableWords.length === 1) {
      // Single word: up-left or up-right depending on space
      positions = [{ angle: goLeft ? -135 : -45 }];
    } else if (availableWords.length === 2) {
      if (goLeft) {
        // Two words angled up-left
        positions = [{ angle: -150 }, { angle: -120 }];
      } else {
        // Two words angled up-right  
        positions = [{ angle: -60 }, { angle: -30 }];
      }
    } else if (availableWords.length === 3) {
      if (goLeft) {
        // Three words spreading up-left
        positions = [{ angle: -165 }, { angle: -135 }, { angle: -105 }];
      } else {
        // Three words spreading up-right
        positions = [{ angle: -75 }, { angle: -45 }, { angle: -15 }];
      }
    } else {
      if (goLeft) {
        // Four words spreading up-left
        positions = [{ angle: -180 }, { angle: -150 }, { angle: -120 }, { angle: -90 }];
      } else {
        // Four words spreading up-right
        positions = [{ angle: -90 }, { angle: -60 }, { angle: -30 }, { angle: 0 }];
      }
    }

    // Convert to coordinates and ensure screen bounds with vertical spacing
    const positionedResults = availableWords.map((word, index) => {
      const angle = positions[index].angle;
      const radians = (angle * Math.PI) / 180;
      
      let x = centerX + Math.cos(radians) * radius;
      let y = centerY + Math.sin(radians) * radius;
      
      // Calculate button dimensions (smaller font and boxes)
      const buttonWidth = Math.max(50, word.text.length * 7 + 18);
      const buttonHeight = 30;
      
      // Ensure button stays on screen
      const halfWidth = buttonWidth / 2;
      const halfHeight = buttonHeight / 2;
      
      x = Math.max(margin + halfWidth, Math.min(window.innerWidth - margin - halfWidth, x));
      y = Math.max(margin + halfHeight, Math.min(window.innerHeight - margin - halfHeight, y));
      
      return {
        ...word,
        x,
        y,
        width: buttonWidth,
        height: buttonHeight
      };
    });

    // Calculate center word dimensions and a circular exclusion radius
    const centerWordWidth = Math.max(50, word.length * 7 + 18);
    const centerWordHeight = 30;
    const centerClearance = 20; // minimum requested clearance
    const centerRadius = Math.sqrt((centerWordWidth / 2) ** 2 + (centerWordHeight / 2) ** 2) + centerClearance + 2;

    // Radial push-out from the center to avoid overlaps with the center word
    positionedResults.forEach(pos => {
      const dx = pos.x - centerX;
      const dy = pos.y - centerY;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      if (dist < centerRadius) {
        const scale = centerRadius / dist;
        pos.x = centerX + dx * scale;
        pos.y = centerY + dy * scale;
        const halfWidth = pos.width / 2;
        const halfHeight = pos.height / 2;
        pos.x = Math.max(margin + halfWidth, Math.min(window.innerWidth - margin - halfWidth, pos.x));
        pos.y = Math.max(margin + halfHeight, Math.min(window.innerHeight - margin - halfHeight, pos.y));
      }
    });

    // Only minimal pairwise separation - just enough to prevent direct overlap
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < positionedResults.length; i++) {
        for (let j = i + 1; j < positionedResults.length; j++) {
          const a = positionedResults[i];
          const b = positionedResults[j];
          const overlapX = (a.width / 2 + b.width / 2 + 4) - Math.abs(a.x - b.x);
          const overlapY = (a.height / 2 + b.height / 2 + 4) - Math.abs(a.y - b.y);
          if (overlapX > 0 && overlapY > 0) {
            const push = Math.min(overlapX, overlapY) / 4; // Very small push
            if (overlapX < overlapY) {
              const dir = a.x <= b.x ? -1 : 1;
              a.x += dir * push;
              b.x -= dir * push;
            } else {
              const dir = a.y <= b.y ? -1 : 1;
              a.y += dir * push;
              b.y -= dir * push;
            }
          }
        }
      }
    }

    // Ensure 20px vertical separation between words
    const minVerticalGap = 18;
    const sortedByY = [...positionedResults].sort((a, b) => a.y - b.y);
    
    for (let i = 1; i < sortedByY.length; i++) {
      const current = sortedByY[i];
      const previous = sortedByY[i - 1];
      
      const previousBottom = previous.y + previous.height / 2;
      const currentTop = current.y - current.height / 2;
      const actualGap = currentTop - previousBottom;
      
      if (actualGap < minVerticalGap) {
        const adjustment = minVerticalGap - actualGap;
        current.y += adjustment;
        
        // Ensure adjusted position stays on screen
        const maxY = window.innerHeight - margin - current.height / 2;
        current.y = Math.min(current.y, maxY);
      }
    }
    
    return positionedResults;
  })();

  const renderButton = (text, key, isCenter = false, position = null) => {
    const isHovered = hoverKey === key;
    const isOriginal = key === 'original';
    
    return (
      <button
        key={key}
        onClick={() => onSelect?.(text)}
        className={`rounded-xl text-sm font-medium whitespace-nowrap shadow-lg border-2 transition-all duration-150 ease-out ${
          isHovered 
            ? 'bg-teal-500 text-white border-teal-600 scale-110 shadow-xl' 
            : isOriginal
              ? 'bg-gray-50 text-gray-800 border-gray-300'
              : 'bg-white text-gray-700 border-gray-200'
        }`}
        style={{ 
          minHeight: position?.height || 30,
          minWidth: position?.width || Math.max(50, text.length * 7 + 18),
          padding: '8px 12px',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          zIndex: isHovered ? 30 : 20
        }}
        title={`Select "${text}"`}
      >
        {text}
      </button>
    );
  };

  return (
    <div 
      className="fixed inset-0 pointer-events-auto"
      style={{ 
        zIndex: 10050,
        backgroundColor: 'rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Background overlay */}
      <div 
        className="absolute inset-0" 
        onClick={() => onClose?.()} 
      />

      {/* Center word (original) */}
      <div
        className="absolute pointer-events-auto"
        style={{ 
          left: centerPosition.x, 
          top: centerPosition.y, 
          transform: 'translate(-50%, -50%)',
          zIndex: 20
        }}
      >
        {renderButton(word, 'original', true)}
      </div>

      {/* Positioned variation words */}
      {positionedWords.map((pos) => (
        <div 
          key={pos.type}
          className="absolute pointer-events-auto" 
          style={{ 
            left: pos.x, 
            top: pos.y, 
            transform: 'translate(-50%, -50%)',
            zIndex: 20
          }}
        >
          {renderButton(pos.text, pos.type, false, pos)}
        </div>
      ))}

      {/* Touch interaction overlay */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onTouchMove={(e) => {
          if (!isActiveDragRef.current) return;
          
          const touch = e.touches[0];
          const x = touch.clientX;
          const y = touch.clientY;
          
          let bestMatch = null;
          let closestDistance = Infinity;
          
          // Check center word
          const centerDx = x - centerPosition.x;
          const centerDy = y - centerPosition.y;
          const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
          if (centerDistance < 80) {
            bestMatch = 'original';
            closestDistance = centerDistance;
          }
          
          // Check positioned words
          positionedWords.forEach(pos => {
            const wordDx = x - pos.x;
            const wordDy = y - pos.y;
            const wordDistance = Math.sqrt(wordDx * wordDx + wordDy * wordDy);
            
            if (wordDistance < 80 && wordDistance < closestDistance) {
              closestDistance = wordDistance;
              bestMatch = pos.type;
            }
          });
          
          if (bestMatch !== hoverKey && bestMatch !== null && bestMatch !== lastHapticKey.current) {
            if (navigator.vibrate) {
              navigator.vibrate(5);
              lastHapticKey.current = bestMatch;
            }
          }
          
          setHoverKey(bestMatch);
          currentHoverKeyRef.current = bestMatch;
        }}
        onTouchEnd={(e) => {
          isActiveDragRef.current = false;
          const currentSelection = currentHoverKeyRef.current || hoverKey;
          
          if (!currentSelection) { 
            onClose?.(); 
            return; 
          }
          
          if (currentSelection === 'original') {
            setHoverKey(null);
            onSelect?.(word);
            return;
          }
          
          const chosenWord = positionedWords.find(pos => pos.type === currentSelection);
          setHoverKey(null);
          
          if (chosenWord?.text) {
            onSelect?.(chosenWord.text);
          } else {
            onClose?.();
          }
        }}
        onTouchStart={(e) => {
          isActiveDragRef.current = true;
        }}
        onMouseMove={(e) => {
          const x = e.clientX;
          const y = e.clientY;
          
          let bestMatch = null;
          let closestDistance = Infinity;
          
          // Check center word
          const centerDx = x - centerPosition.x;
          const centerDy = y - centerPosition.y;
          const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
          if (centerDistance <= 60) {
            bestMatch = 'original';
            closestDistance = centerDistance;
          }
          
          // Check positioned words
          positionedWords.forEach(pos => {
            const wordDx = x - pos.x;
            const wordDy = y - pos.y;
            const wordDistance = Math.sqrt(wordDx * wordDx + wordDy * wordDy);
            
            if (wordDistance <= 60 && wordDistance < closestDistance) {
              closestDistance = wordDistance;
              bestMatch = pos.type;
            }
          });
          
          setHoverKey(bestMatch);
        }}
        onMouseLeave={() => {
          setHoverKey(null);
        }}
      />
    </div>
  );
};

export default SimpleVariationPopup;