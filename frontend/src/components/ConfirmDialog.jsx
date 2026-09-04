import React, { useEffect } from 'react';

export function ConfirmDialog({ isOpen, title, message, confirmText = 'Delete Record', onConfirm, onCancel }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '460px', borderColor: 'var(--accent-orange)', boxShadow: '8px 8px 0 var(--accent-orange)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="modal-header" style={{ background: 'linear-gradient(90deg, #3d1515 0%, var(--bg-card) 100%)' }}>
          <h3 id="confirm-dialog-title" className="modal-title" style={{ color: 'var(--accent-orange)' }}>
            ⚠️ {title || 'Confirm Action'}
          </h3>
          <button type="button" className="modal-close-btn" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.6' }}>
            {message || 'Are you sure you wish to delete this record from the academic registry? This cannot be undone.'}
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger-solid" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
