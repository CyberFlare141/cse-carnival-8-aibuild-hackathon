import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { LoadingState, EmptyState, ErrorState } from '../components/StateMessages';

export function EventsView({ onEditItem, onDeleteItem, onAddNew, onOpenRegisterModal }) {
  const { events, loading, errors, fetchSection, cancelRegistration } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventId, setExpandedEventId] = useState(null);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const query = searchQuery.toLowerCase().trim();
      return (
        !query ||
        evt.name?.toLowerCase().includes(query) ||
        evt.description?.toLowerCase().includes(query) ||
        evt.venue?.toLowerCase().includes(query) ||
        evt.organizer?.toLowerCase().includes(query)
      );
    });
  }, [events, searchQuery]);

  const handleCancelRegistration = async (eventId, studentName) => {
    if (window.confirm(`Remove registration for "${studentName}"?`)) {
      await cancelRegistration(eventId, studentName);
    }
  };

  const toggleExpand = (id) => {
    setExpandedEventId((prev) => (prev === id ? null : id));
  };

  if (loading.events && events.length === 0) {
    return <LoadingState message="Checking campus activities, guest lectures, hackathons, and attendee registers..." />;
  }
  if (errors.events && events.length === 0) {
    return <ErrorState message={errors.events} onRetry={() => fetchSection('events')} />;
  }

  return (
    <div className="board-workspace">
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <span style={{ fontSize: '14px', color: 'var(--accent-yellow)', fontWeight: 800 }}>
            ⚡ {filteredEvents.length} Campus {filteredEvents.length === 1 ? 'Event' : 'Events'} Scheduled
          </span>
        </div>

        <div className="toolbar-group">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search event name, venue, organizer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No Campus Events on the Board"
          description={
            searchQuery
              ? 'No events match your search query.'
              : 'There are currently no upcoming university events or seminars posted.'
          }
          actionText="Post New Event"
          onAction={onAddNew}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filteredEvents.map((evt, idx) => {
            const isExpanded = expandedEventId === evt.id;
            const regCount = evt.registered || evt.registrants?.length || 0;
            const cap = evt.capacity || 1;
            const fillRatio = Math.min(100, Math.round((regCount / cap) * 100));
            const isFull = regCount >= cap;
            const accentClass = `card-accent-${idx % 5}`;

            return (
              <div key={evt.id} className={`event-card ${accentClass} record-animated`}>
                <div className="event-top-bar">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff' }}>
                        {evt.name}
                      </h3>
                      <span className={`stamp ${isFull ? 'stamp-late' : 'stamp-available'}`}>
                        {isFull ? 'FULL' : evt.status?.toUpperCase() || 'UPCOMING'}
                      </span>
                    </div>

                    <div className="event-details-meta">
                      <div className="event-meta-item">
                        <span>📅</span>
                        <strong style={{ color: '#ffffff' }}>{evt.date}</strong>
                      </div>
                      {evt.time && (
                        <div className="event-meta-item">
                          <span>⏰</span>
                          <span>{evt.time}</span>
                        </div>
                      )}
                      {evt.venue && (
                        <div className="event-meta-item">
                          <span>📍</span>
                          <span className="code-badge" style={{ padding: '2px 8px', fontSize: '12px' }}>
                            {evt.venue}
                          </span>
                        </div>
                      )}
                      {evt.organizer && (
                        <div className="event-meta-item">
                          <span>🏛️</span>
                          <span style={{ color: 'var(--accent-cyan)' }}>{evt.organizer}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="event-action-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onOpenRegisterModal(evt)}
                      disabled={isFull}
                      title={isFull ? 'Event is at maximum capacity' : 'Register a student'}
                    >
                      {isFull ? 'At Capacity' : '⚡ Register Student'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEditItem(evt)}
                      title="Edit event details"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => onDeleteItem(evt)}
                      title="Remove event"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {evt.description && (
                  <p style={{ fontSize: '14.5px', color: 'var(--text-muted)', lineHeight: '1.65', marginBottom: '16px' }}>
                    {evt.description}
                  </p>
                )}

                {/* Neon Capacity Fill Meter */}
                <div className="capacity-meter-wrapper">
                  <div className="capacity-meter-label">
                    <span>
                      Attendee Meter: <strong style={{ color: '#ffffff' }}>{regCount}</strong> / {evt.capacity} seats confirmed
                    </span>
                    <span style={{ color: fillRatio >= 90 ? 'var(--accent-orange)' : 'var(--accent-cyan)' }}>
                      {fillRatio}% Booked
                    </span>
                  </div>
                  <div className="capacity-bar-track">
                    <div
                      className={`capacity-bar-fill ${fillRatio >= 90 ? 'warning' : ''}`}
                      style={{ width: `${fillRatio}%` }}
                    />
                  </div>
                </div>

                {/* Registrants Roster */}
                <div className="registrants-tray">
                  <div className="registrant-action-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(evt.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--accent-cyan)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: 0,
                      }}
                    >
                      <span>Attendee Roster ({evt.registrants?.length || 0})</span>
                      <span>{isExpanded ? '▲ Hide Roster' : '▼ View Registered Students'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenRegisterModal(evt)}
                    >
                      + Add Student
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '14px' }}>
                      {!evt.registrants || evt.registrants.length === 0 ? (
                        <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                          No students currently registered for this event.
                        </p>
                      ) : (
                        <div className="registrants-tags-wrapper">
                          {evt.registrants.map((name, regIdx) => (
                            <span key={regIdx} className="registrant-chip">
                              <span>👤 {name}</span>
                              <button
                                type="button"
                                className="registrant-remove-btn"
                                onClick={() => handleCancelRegistration(evt.id, name)}
                                title={`Cancel registration for ${name}`}
                                aria-label={`Cancel registration for ${name}`}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
