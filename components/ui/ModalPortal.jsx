import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Create a single portal container that gets reused
let portalContainer = null;
const getPortalContainer = () => {
  if (!portalContainer) {
    portalContainer = document.createElement('div');
    portalContainer.id = 'modal-portal-root';
    portalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10050;
      contain: layout style paint;
    `;
    document.body.appendChild(portalContainer);
  }
  return portalContainer;
};

const ModalPortal = ({ children, isOpen }) => {
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const container = getPortalContainer();
    
    if (isOpen && !wasOpenRef.current) {
      // Prevent body scroll - simple and fast
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      container.style.pointerEvents = 'auto';
      wasOpenRef.current = true;
    } else if (!isOpen && wasOpenRef.current) {
      // Restore scroll and disable pointer events
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      container.style.pointerEvents = 'none';
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Use optimized portal container
  const container = getPortalContainer();

  return createPortal(
    <div style={{ 
      width: '100%', 
      height: '100%',
      willChange: 'transform, opacity',
      contain: 'layout style paint'
    }}>
      {children}
    </div>, 
    container
  );
};

export default ModalPortal;
