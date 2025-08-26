import React, { useEffect, useMemo, useRef, useState } from 'react';
import ModalPortal from '../ui/ModalPortal';

// Variation popup shows: original (center), 2 synonyms (left/right), enhanced (top), opposite (bottom)
const VariationPopup = ({ isOpen, anchorRect, word, variations, onSelect, onClose }) => {
  const [hoverKey, setHoverKey] = useState(null);
  const containerRef = useRef(null);

  // Debug popup state
  useEffect(() => {
    try {
      console.log('🎪 [VariationPopup] Render state', JSON.stringify({
        isOpen,
        word,
        hasVariations: !!variations,
        anchorRect: anchorRect ? 'present' : 'missing'
      }, null, 2));
    } catch {}
  }, [isOpen, word, variations, anchorRect]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  try {
    console.log('🎪 [VariationPopup] Component called with isOpen:', isOpen);
  } catch {}

  if (!isOpen) return null;

  try {
    console.log('🎪 [VariationPopup] Rendering popup for word:', word);
  } catch {}

  // Use visual viewport when available to position correctly on mobile while keyboard/scrolling
  const viewportX = typeof window !== 'undefined' && window.visualViewport ? window.visualViewport.offsetLeft : 0;
  const viewportY = typeof window !== 'undefined' && window.visualViewport ? window.visualViewport.offsetTop : 0;
  const centerX = anchorRect ? anchorRect.left + anchorRect.width / 2 - viewportX : (typeof window !== 'undefined' ? (window.innerWidth / 2) : 0);
  const centerY = anchorRect ? anchorRect.top + anchorRect.height / 2 - viewportY : (typeof window !== 'undefined' ? (window.innerHeight / 2) : 0);

  const bubble = (label, key) => {
    const isHover = hoverKey === key;
    return (
      <button
        key={key}
        onClick={() => onSelect?.(label)}
        onMouseEnter={() => setHoverKey(key)}
        onMouseLeave={() => setHoverKey(null)}
        onTouchStart={() => setHoverKey(key)}
        onTouchEnd={() => setHoverKey(null)}
        className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap shadow-lg border active:scale-95 ${
          isHover ? 'bg-teal-600 text-white border-teal-700/30' : 'bg-white border-gray-200 text-gray-800'
        }`}
        style={{ minHeight: 36 }}
      >
        {label}
      </button>
    );
  };

  const { original, synonyms = [], enhanced, opposite } = variations || {};
  const left = synonyms[0] || null;
  const right = synonyms[1] || null;

  return (
    <ModalPortal isOpen={true}>
      <div className="fixed inset-0" style={{ zIndex: 10050 }}>
        {/* Dim background */}
        <div className="absolute inset-0 bg-black/40" onClick={() => { try { console.log('🕳️ [VariationPopup] backdrop click'); } catch {} onClose?.(); }} />

        {/* Bubbles around the center with hold-and-drag select */}
        <div
          className="absolute flex items-center justify-center"
          style={{ left: 0, top: 0, width: '100%', height: '100%' }}
          ref={containerRef}
        >
          {/* Center word */}
          <div
            className="absolute"
            style={{ left: centerX, top: centerY, transform: 'translate(-50%, -50%)' }}
          >
            <div className="flex items-center justify-center">
              <div className="px-4 py-3 rounded-full text-xs font-semibold bg-teal-600 text-white shadow-lg border border-teal-700/30">
                {word}
              </div>
            </div>
          </div>

          {/* Top - Enhanced */}
          {enhanced && (
            <div className="absolute" style={{ left: centerX, top: centerY - 64, transform: 'translate(-50%, -50%)' }}>
              {bubble(enhanced, 'enhanced')}
            </div>
          )}

          {/* Bottom - Opposite */}
          {opposite && (
            <div className="absolute" style={{ left: centerX, top: centerY + 64, transform: 'translate(-50%, -50%)' }}>
              {bubble(opposite, 'opposite')}
            </div>
          )}

          {/* Left - Synonym 1 */}
          {left && (
            <div className="absolute" style={{ left: centerX - 96, top: centerY, transform: 'translate(-50%, -50%)' }}>
              {bubble(left, 'left')}
            </div>
          )}

          {/* Right - Synonym 2 */}
          {right && (
            <div className="absolute" style={{ left: centerX + 96, top: centerY, transform: 'translate(-50%, -50%)' }}>
              {bubble(right, 'right')}
            </div>
          )}

          {/* Touch drag to select - highlight and select on lift */}
          <div
            className="absolute inset-0"
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const x = touch.clientX;
              const y = touch.clientY;
              // hit test against simple radial sectors from center
              const dx = x - centerX;
              const dy = y - centerY;
              const absDx = Math.abs(dx);
              const absDy = Math.abs(dy);
              let key = null;
              if (absDy > absDx) {
                if (dy < -36 && enhanced) key = 'enhanced';
                else if (dy > 36 && opposite) key = 'opposite';
              } else {
                if (dx < -60 && left) key = 'left';
                else if (dx > 60 && right) key = 'right';
              }
              try { console.log('🧭 [VariationPopup] drag', JSON.stringify({ x, y, key }, null, 2)); } catch {}
              setHoverKey(key);
            }}
            onTouchEnd={() => {
              if (!hoverKey) { onClose?.(); return; }
              const map = {
                enhanced,
                opposite,
                left,
                right
              };
              const chosen = map[hoverKey];
              setHoverKey(null);
              if (chosen) {
                try { console.log('🎯 [VariationPopup] chosen', JSON.stringify({ hoverKey, chosen }, null, 2)); } catch {}
                onSelect?.(chosen);
              }
            }}
          />
        </div>
      </div>
    </ModalPortal>
  );
};

export default VariationPopup;


