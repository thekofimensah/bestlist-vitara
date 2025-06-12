import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const ModalLayout = ({ isOpen, onClose, title, children, footer }) => {
  const modalRef = useRef(null);

  // Focus trap (basic)
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={onClose}
        >
          <motion.div
            className="bg-white w-full h-full max-h-screen rounded-t-3xl md:rounded-3xl p-0 flex flex-col relative focus:outline-none"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={e => e.stopPropagation()}
            ref={modalRef}
            tabIndex={0}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-3xl">
              <span className="font-semibold text-base text-gray-800 truncate">{title}</span>
              <motion.button
                onClick={onClose}
                className="p-1 bg-gray-100 rounded-full"
                whileTap={{ scale: 0.9 }}
                aria-label="Close"
              >
                <X size={18} className="text-gray-600" />
              </motion.button>
            </div>
            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-8 pb-4" style={{ maxHeight: 'calc(100dvh - 120px)', paddingBottom: 88 }}>
              {children}
            </div>
            {/* Footer (fixed above bottom bar) */}
            {footer && (
              <div className="fixed left-0 right-0 bottom-0 bg-white pt-2 pb-4 z-50 px-4 border-t border-gray-100">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModalLayout; 