import React, { useRef, useState } from 'react';

const SuggestionButton = React.memo(({ suggestion, onTap }) => {
  const buttonRef = useRef(null);
  const [isPressed, setIsPressed] = useState(false);
  const tapStateRef = useRef({ lastTapTime: 0, isDoubleTapHandled: false, resetTimer: null });

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
      executeTap(true); // Double tap - add negative word
      tapStateRef.current.lastTapTime = 0; // Reset for next sequence
      tapStateRef.current.isDoubleTapHandled = true;
    } else {
      console.log('Setting up for potential single/first tap. lastTapTime was:', tapStateRef.current.lastTapTime, 'timeSinceLastTap:', timeSinceLastTap);
      
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
  };

  const onPointerLeave = () => {
    setIsPressed(false);
    // Don't reset lastTapTime here - let double tap detection work across brief pointer leaves
  };

  return (
    <button
      ref={buttonRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      className={`px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all select-none border ${
        isPressed
          ? 'bg-gray-200 text-gray-900 border-gray-300'
          : 'bg-white text-gray-700 border-gray-200 shadow-sm'
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


