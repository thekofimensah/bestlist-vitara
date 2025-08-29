import React, { useRef, useState, useCallback } from 'react';

// Touch-friendly suggestion pill with long-press detection  
const LONG_PRESS_MS = 300; // Slightly faster for better UX

const SuggestionButton = React.memo(({ suggestion, onTap, onLongPress }) => {
  const timerRef = useRef(null);
  const ignoreMouseRef = useRef(false);
  const longPressTriggeredRef = useRef(false);
  const buttonRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);
  const initialTouchRef = useRef(null); // Track initial touch for scroll detection

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const triggerLongPress = useCallback(() => {
    longPressTriggeredRef.current = true;
    if (navigator.vibrate) navigator.vibrate(10);
    const rect = buttonRef.current?.getBoundingClientRect();
    try {
      console.log('🟢 [SuggestionButton] Long press detected', JSON.stringify({
        id: suggestion?.id,
        label: suggestion?.label,
        rect
      }, null, 2));
    } catch {}
    
    // Pass through any active touch information
    const activeTouches = Array.from(document.querySelectorAll(':active'));
    onLongPress?.(suggestion, rect, { hasActiveTouch: activeTouches.length > 0 });
  }, [suggestion, onLongPress]);

  const onPointerDown = (e) => {
    setIsPressed(true);
    longPressTriggeredRef.current = false;
    clearTimer();
    
    // Track initial touch position for scroll detection
    if (e.touches && e.touches[0]) {
      initialTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
    
    try { console.log('🟡 [SuggestionButton] Pointer down', String(suggestion?.label || '')); } catch {}
    timerRef.current = setTimeout(triggerLongPress, LONG_PRESS_MS);
  };

  const onPointerUp = (e) => {
    clearTimer();
    
    // Check if this was a scroll gesture vs a tap
    let wasScrolling = false;
    if (initialTouchRef.current && e.changedTouches && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - initialTouchRef.current.x);
      const deltaY = Math.abs(touch.clientY - initialTouchRef.current.y);
      const deltaTime = Date.now() - initialTouchRef.current.time;
      
      // Consider it scrolling if moved more than 15px horizontally with some speed
      wasScrolling = deltaX > 15 && deltaTime < 300;
    }
    
    try { 
      console.log('🔵 [SuggestionButton] Pointer up', JSON.stringify({ 
        label: suggestion?.label, 
        longPressTriggered: longPressTriggeredRef.current,
        wasScrolling 
      }, null, 2)); 
    } catch {}
    
    if (!longPressTriggeredRef.current && !wasScrolling) {
      setIsPressed(false); // Reset immediately for normal taps
      // Get button rectangle for animation
      const rect = buttonRef.current?.getBoundingClientRect();
      onTap?.(suggestion, rect);
    } else if (longPressTriggeredRef.current) {
      // For long press, reset after a delay to allow smooth popup transition
      setTimeout(() => {
        setIsPressed(false);
        longPressTriggeredRef.current = false;
      }, 50);
    } else {
      setIsPressed(false); // Reset for scrolling or other cases
    }
    
    initialTouchRef.current = null; // Reset
  };

  const onPointerLeave = () => {
    setIsPressed(false);
    clearTimer();
  };

  return (
    <button
      ref={buttonRef}
      onMouseDown={(e) => { if (ignoreMouseRef.current) return; onPointerDown(e); }}
      onMouseUp={(e) => { if (ignoreMouseRef.current) return; onPointerUp(e); }}
      onMouseLeave={onPointerLeave}
      onTouchStart={(e) => { 
        e.stopPropagation(); 
        e.preventDefault(); // Prevent scrolling when touching suggestions
        ignoreMouseRef.current = true; 
        onPointerDown(e); 
      }}
      onTouchEnd={(e) => { 
        if (longPressTriggeredRef.current) {
          // Don't consume the touch end if long press was triggered - let it bubble to popup
          try { console.log('🎭 [SuggestionButton] Long press active, not consuming touchend'); } catch {}
          return;
        }
        e.stopPropagation(); 
        onPointerUp(e); 
        setTimeout(() => { ignoreMouseRef.current = false; }, 400); 
      }}
      onTouchCancel={onPointerLeave}
      className={`px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all select-none border ${
        isPressed ? 'bg-gray-200 text-gray-900 border-gray-300' : 'bg-white text-gray-700 border-gray-200 shadow-sm'
      }`}
      style={{
        minHeight: 28,
        minWidth: Math.max(36, suggestion.label.length * 7 + 20), // Dynamic width based on text length, 20% bigger
      }}
    >
      {suggestion.label}
    </button>
  );
});

export default SuggestionButton;


