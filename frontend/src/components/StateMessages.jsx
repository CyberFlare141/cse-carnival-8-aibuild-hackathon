import React from 'react';

/**
 * Loading state in dopamine maximalist voice
 */
export function LoadingState({ message = 'Accessing university records ledger...' }) {
  return (
    <div className="state-container record-animated">
      <div className="state-emblem" aria-hidden="true">
        ⚡
      </div>
      <div className="state-title text-gradient">SYNCING REGISTRY DATA</div>
      <p className="state-description">{message}</p>
    </div>
  );
}

/**
 * Empty state in dopamine maximalist voice
 */
export function EmptyState({ title, description, actionText, onAction }) {
  return (
    <div className="state-container record-animated">
      <div className="state-emblem" aria-hidden="true">
        ✨
      </div>
      <div className="state-title">{title || 'No Records Found on Notice Ledger'}</div>
      <p className="state-description">
        {description || 'There are currently no active notices or entries recorded in this ledger.'}
      </p>
      {actionText && onAction && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onAction}
          style={{ marginTop: '12px' }}
        >
          <span>⚡</span>
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-container record-animated" role="alert">
      <div className="state-emblem" aria-hidden="true">⚠</div>
      <div className="state-title">UNABLE TO LOAD REGISTRY DATA</div>
      <p className="state-description">{message || 'The CampusOS backend did not return this data.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onRetry} style={{ marginTop: '12px' }}>
          Retry
        </button>
      )}
    </div>
  );
}
