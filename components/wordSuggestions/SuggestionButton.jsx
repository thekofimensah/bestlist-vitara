import React, { useRef, useState } from 'react';

const SuggestionButton = React.memo(({ suggestion, onTap, rating = 3, isRemoving = false }) => {
  const buttonRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isDoubleTapPreview, setIsDoubleTapPreview] = useState(false);
  const tapStateRef = useRef({ lastTapTime: 0, isDoubleTapHandled: false, resetTimer: null });

  // Determine colors based on rating and tap type
  const getButtonColors = (isPressed, isDoubleTap = false) => {
    if (isPressed) {
      // Show pressed state - neutral gray
      return 'bg-gray-100 text-gray-800 border-gray-300';
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
    
    if (tapStateRef.current.lastTapTime > 0 && timeSinceLastTap < 180) {
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
      }, 185); // Slightly longer than double tap window (300ms)
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
      onPointerDown={isRemoving ? undefined : onPointerDown}
      onPointerUp={isRemoving ? undefined : onPointerUp}
      onPointerLeave={isRemoving ? undefined : onPointerLeave}
      className={`px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap select-none border ${
        getButtonColors(isPressed, isDoubleTapPreview)
      }`}
      style={{
        minHeight: 28,
        minWidth: Math.max(36, suggestion.label.length * 7 + 20), // Dynamic width based on text length, 20% bigger
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
        pointerEvents: isRemoving ? 'none' : 'auto',
        willChange: isRemoving ? 'opacity, transform' : 'auto', // Optimize for animation
      }}
    >
      {suggestion.label}
    </button>
  );
});

export default SuggestionButton;


