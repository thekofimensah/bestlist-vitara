import React, { useRef, useState } from 'react';

const SuggestionButton = React.memo(({ suggestion, onTap, rating = 3 }) => {
  const buttonRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isDoubleTapPreview, setIsDoubleTapPreview] = useState(false);
  const tapStateRef = useRef({ lastTapTime: 0, isDoubleTapHandled: false, resetTimer: null });

  // Determine colors based on rating and tap type
  const getButtonColors = (isPressed, isDoubleTap = false) => {
    const isLowRating = rating <= 2; // 1-2 stars
    
    // For low ratings (1-2): single tap = red (negative), double tap = teal (positive opposite)
    // For high ratings (3-5): single tap = teal (positive), double tap = red (negative opposite)
    const singleTapColor = isLowRating ? 'red' : 'teal';
    const doubleTapColor = isLowRating ? 'teal' : 'red';
    
    if (isPressed) {
      // Show preview of what color it will be when tapped
      const previewColor = isDoubleTap ? doubleTapColor : singleTapColor;
      
      if (previewColor === 'red') {
        return 'bg-red-100 text-red-800 border-red-200';
      } else {
        return 'bg-teal-100 text-teal-800 border-teal-200';
      }
    }
    
    // Default state - neutral
    return 'bg-white text-gray-700 border-gray-200 shadow-sm hover:bg-gray-50';
  };

  const executeTap = (isDoubleTap = false) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    onTap?.(suggestion, rect, isDoubleTap);
  };

  const onPointerDown = (e) => {
    // Prevent scrolling from interfering with tap detection
    e.preventDefault();
    setIsPressed(true);
    
    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - tapStateRef.current.lastTapTime;
    
    console.log('DOWN: currentTime:', currentTime, 'lastTapTime:', tapStateRef.current.lastTapTime, 'timeSinceLastTap:', timeSinceLastTap, 'isDoubleTapHandled:', tapStateRef.current.isDoubleTapHandled);
    
    if (tapStateRef.current.lastTapTime > 0 && timeSinceLastTap < 160) {
      console.log('Double tap detected! timeSinceLastTap:', timeSinceLastTap);
      setIsDoubleTapPreview(true); // Show double tap color preview
      executeTap(true); // Double tap - add opposite word
      tapStateRef.current.lastTapTime = 0; // Reset for next sequence
      tapStateRef.current.isDoubleTapHandled = true;
    } else {
      console.log('Setting up for potential single/first tap. lastTapTime was:', tapStateRef.current.lastTapTime, 'timeSinceLastTap:', timeSinceLastTap);
      
      setIsDoubleTapPreview(false); // Show single tap color preview
      
      // Clear any existing reset timer
      if (tapStateRef.current.resetTimer) {
        clearTimeout(tapStateRef.current.resetTimer);
      }
      
      tapStateRef.current.lastTapTime = currentTime;
      tapStateRef.current.isDoubleTapHandled = false;
      
      // Set a timer to reset lastTapTime after 500ms (longer than double tap window)
      tapStateRef.current.resetTimer = setTimeout(() => {
        console.log('Resetting lastTapTime after timeout');
        tapStateRef.current.lastTapTime = 0;
      }, 500);
    }
  };

  const onPointerUp = () => {
    console.log('UP:', {
      isPressed,
      isDoubleTapHandled: tapStateRef.current.isDoubleTapHandled
    });

    if (isPressed && !tapStateRef.current.isDoubleTapHandled) {
      // Delay single tap execution to allow for potential double tap
      setTimeout(() => {
        if (!tapStateRef.current.isDoubleTapHandled) {
          console.log('Executing delayed single tap');
          executeTap(false); // Single tap - add word
        } else {
          console.log('Single tap cancelled - double tap was detected');
        }
      }, 165); // Slightly longer than double tap window (300ms)
    } else if (tapStateRef.current.isDoubleTapHandled) {
      console.log('Double tap already handled, skipping');
    }
    setIsPressed(false);
    setIsDoubleTapPreview(false);
  };

  const onPointerLeave = () => {
    // If we're currently pressed (holding), cancel the tap
    if (isPressed) {
      tapStateRef.current.lastTapTime = 0;
      tapStateRef.current.isDoubleTapHandled = true; // Prevent the tap from executing
      if (tapStateRef.current.resetTimer) {
        clearTimeout(tapStateRef.current.resetTimer);
      }
      console.log('Cancelling tap due to pointer leave while pressed');
    }
    setIsPressed(false);
    setIsDoubleTapPreview(false);
  };

  return (
    <button
      ref={buttonRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      className={`px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all select-none border ${
        getButtonColors(isPressed, isDoubleTapPreview)
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


