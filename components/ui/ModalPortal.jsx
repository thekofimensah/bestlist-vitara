import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const ModalPortal = ({ children, isOpen }) => {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      // Cleanup function to restore scroll
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Create portal to render modal outside the main component tree
  return createPortal(children, document.body);
};

export default ModalPortal;
