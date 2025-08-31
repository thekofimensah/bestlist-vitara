import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Create portal containers with different z-indexes
let modalPortalContainer = null;
let toastPortalContainer = null;

const getPortalContainer = (type = 'modal') => {
  if (type === 'toast') {
    if (!toastPortalContainer) {
      toastPortalContainer = document.createElement('div');
      toastPortalContainer.id = 'toast-portal-root';
      toastPortalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1100;
        contain: layout style paint;
      `;
      document.body.appendChild(toastPortalContainer);
    }
    return toastPortalContainer;
  } else {
    if (!modalPortalContainer) {
      modalPortalContainer = document.createElement('div');
      modalPortalContainer.id = 'modal-portal-root';
      modalPortalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1050;
        contain: layout style paint;
      `;
      document.body.appendChild(modalPortalContainer);
    }
    return modalPortalContainer;
  }
};

const ModalPortal = ({ children, isOpen, type = 'modal' }) => {
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const container = getPortalContainer(type);
    
    if (isOpen && !wasOpenRef.current) {
      // Only prevent body scroll for modals, not toasts
      if (type === 'modal') {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        container.style.pointerEvents = 'auto';
      }
      // Toasts don't need to enable pointer events on the container
      // They should remain pointer-events: none to allow clicks through
      wasOpenRef.current = true;
    } else if (!isOpen && wasOpenRef.current) {
      // Only restore scroll for modals, not toasts
      if (type === 'modal') {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        container.style.pointerEvents = 'none';
      }
      wasOpenRef.current = false;
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  // Use optimized portal container
  const container = getPortalContainer(type);

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
