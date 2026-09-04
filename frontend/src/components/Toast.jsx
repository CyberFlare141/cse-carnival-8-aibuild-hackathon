import React from 'react';
import { useData } from '../context/DataContext';

export function ToastContainer() {
  const { toasts, removeToast } = useData();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? '⚡' : toast.type === 'error' ? '⚠️' : '✦';

        return (
          <div key={toast.id} className={`toast ${toast.type || 'info'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>{icon}</span>
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
