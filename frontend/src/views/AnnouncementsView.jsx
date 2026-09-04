import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { LoadingState, EmptyState, ErrorState } from '../components/StateMessages';

export function AnnouncementsView({ onEditItem, onDeleteItem, onAddNew }) {
  const { announcements, loading, errors, fetchSection } = useData();
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const priorities = ['All', 'High', 'Medium', 'Low'];

  const filteredNotices = useMemo(() => {
    return announcements.filter((item) => {
      const matchPriority =
        selectedPriority === 'All' || item.priority?.toLowerCase() === selectedPriority.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.body?.toLowerCase().includes(query) ||
        item.posted_by?.toLowerCase().includes(query);
      return matchPriority && matchSearch;
    });
  }, [announcements, selectedPriority, searchQuery]);

  if (loading.announcements && announcements.length === 0) {
    return <LoadingState message="Fetching official campus bulletins, academic circulars, and notices..." />;
  }
  if (errors.announcements && announcements.length === 0) {
    return <ErrorState message={errors.announcements} onRetry={() => fetchSection('announcements')} />;
  }

  return (
    <div className="board-workspace">
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <div className="filter-tabs">
            {priorities.map((p) => (
              <button
                key={p}
                type="button"
                className={`filter-tab ${selectedPriority === p ? 'active' : ''}`}
                onClick={() => setSelectedPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-group">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search notices by keyword or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredNotices.length === 0 ? (
        <EmptyState
          title="No Notices Posted on This Board"
          description={
            searchQuery || selectedPriority !== 'All'
              ? 'No announcements match your search or priority criteria.'
              : 'There are currently no active notices pinned to the bulletin board.'
          }
          actionText="Pin New Notice"
          onAction={onAddNew}
        />
      ) : (
        <div className="bulletin-grid">
          {filteredNotices.map((notice, idx) => {
            const prio = (notice.priority || 'medium').toLowerCase();
            const accentClass = `card-accent-${idx % 5}`;
            const stampClass =
              prio === 'high' ? 'stamp-high' : prio === 'medium' ? 'stamp-medium' : 'stamp-low';

            return (
              <div key={notice.id} className={`bulletin-card ${accentClass} record-animated`}>
                <div className="bulletin-header">
                  <h3 className="bulletin-title">{notice.title}</h3>
                  <span className={`stamp ${stampClass}`}>
                    {prio === 'high' ? '⚡ URGENT' : prio.toUpperCase()}
                  </span>
                </div>

                <p className="bulletin-body">{notice.body}</p>

                <div className="bulletin-footer">
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {notice.posted_by || 'Administration'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Posted: {notice.date}
                      {notice.expires && ` · Exp: ${notice.expires}`}
                    </div>
                  </div>

                  <div className="bulletin-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEditItem(notice)}
                      title="Edit notice"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => onDeleteItem(notice)}
                      title="Remove notice from board"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
