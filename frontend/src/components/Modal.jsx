/**
 * MODAL COMPONENT
 * 
 * Purpose: Reusable modal dialog component that renders as an overlay
 * Design: Uses React Portal to render outside the main DOM tree
 * 
 * Key Features:
 * 1. Portal-based rendering for proper z-index layering
 * 2. Click-outside-to-close functionality
 * 3. ESC key support for accessibility
 * 4. Customizable content and styling
 * 5. Cleveland Cavaliers branding integration
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

// Modal: Reusable dialog overlay component - Called from App.jsx for various dialogs
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'normal', // 'normal', 'large'
  isDanger = false // For delete/discard confirmations
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className={`modal-content ${size === 'large' ? 'modal-content-large' : ''} ${isDanger ? 'modal-danger' : ''}`}>
        {title && (
          <h2 className={`modal-header ${isDanger ? 'modal-header-danger' : ''}`}>
            {title}
          </h2>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );

  // Render using portal to ensure it appears on top
  return createPortal(modalContent, document.body);
};

export default Modal;
