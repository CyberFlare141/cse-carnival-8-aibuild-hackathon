import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { LoadingState, EmptyState, ErrorState } from '../components/StateMessages';

export function RoomsView({ onEditItem, onDeleteItem, onAddNew, onOpenBookModal }) {
  const { rooms, loading, errors, fetchSection, cancelBooking } = useData();
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRoomId, setExpandedRoomId] = useState(null);

  const roomTypes = ['All', 'Classroom', 'Lab', 'Seminar'];

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchType =
        selectedType === 'All' || r.type?.toLowerCase() === selectedType.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        r.roomNumber?.toLowerCase().includes(query) ||
        r.equipment?.some((eq) => eq.toLowerCase().includes(query));
      return matchType && matchSearch;
    });
  }, [rooms, selectedType, searchQuery]);

  const toggleExpand = (id) => {
    setExpandedRoomId((prev) => (prev === id ? null : id));
  };

  const handleCancelBooking = async (roomId, bookingId, bookedBy) => {
    if (window.confirm(`Cancel reservation under "${bookedBy}"?`)) {
      await cancelBooking(roomId, bookingId);
    }
  };

  if (loading.rooms && rooms.length === 0) {
    return <LoadingState message="Inspecting physical campus facilities, equipment manifests, and room reservation ledgers..." />;
  }
  if (errors.rooms && rooms.length === 0) {
    return <ErrorState message={errors.rooms} onRetry={() => fetchSection('rooms')} />;
  }

  return (
    <div className="board-workspace">
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <div className="filter-tabs">
            {roomTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={`filter-tab ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
              >
                {type}
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
              placeholder="Search room (e.g. 7A03) or equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <EmptyState
          title="No Rooms Found in Facility Registry"
          description={
            searchQuery || selectedType !== 'All'
              ? 'No rooms match the selected filter or search term.'
              : 'No campus rooms have been registered yet.'
          }
          actionText="Register Room"
          onAction={onAddNew}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {filteredRooms.map((room, idx) => {
            const isExpanded = expandedRoomId === room.id;
            const bookingsCount = room.bookings?.length || 0;
            const accentClass = `card-accent-${idx % 5}`;

            return (
              <div key={room.id} className={`room-card ${accentClass} record-animated`}>
                <div
                  className="room-summary-bar"
                  onClick={() => toggleExpand(room.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleExpand(room.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={isExpanded}
                  aria-controls={`room-bookings-${room.id}`}
                >
                  <div className="room-id-group">
                    <span className="room-number-tag">{room.roomNumber}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, textTransform: 'capitalize', color: '#ffffff', fontSize: '17px' }}>
                          {room.type || 'Classroom'}
                        </span>
                        <span className="stamp stamp-available">Floor {room.floor || 7}</span>
                        <span
                          className="stamp"
                          style={{
                            backgroundColor: 'var(--bg-dark)',
                            borderColor: 'var(--accent-purple)',
                            color: 'var(--accent-cyan)',
                          }}
                        >
                          👥 {room.capacity} seats
                        </span>
                      </div>

                      {room.equipment && room.equipment.length > 0 && (
                        <div className="equipment-tag-list" style={{ marginTop: '8px' }}>
                          {room.equipment.map((eq, eqIdx) => (
                            <span key={eqIdx} className="equipment-pill">
                              ✦ {eq}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="room-action-row"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onOpenBookModal(room)}
                      title="Reserve this room"
                    >
                      ⚡ Book Room
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEditItem(room)}
                      title="Edit room specs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => onDeleteItem(room)}
                      title="Delete room"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px' }}
                      onClick={() => toggleExpand(room.id)}
                    >
                      {bookingsCount} {bookingsCount === 1 ? 'Booking' : 'Bookings'} {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE BOOKINGS PANEL */}
                {isExpanded && (
                  <div id={`room-bookings-${room.id}`} className="room-bookings-panel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--accent-yellow)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>📅</span>
                        <span>Active Bookings for Room {room.roomNumber}</span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onOpenBookModal(room)}
                      >
                        + Add Booking
                      </button>
                    </div>

                    {bookingsCount === 0 ? (
                      <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic' }}>
                        No active reservations recorded for this room. Room is fully available.
                      </p>
                    ) : (
                      <div className="bookings-ledger-list">
                        {room.bookings.map((b) => (
                          <div key={b.id || b.booking_id} className="booking-item-row">
                            <div>
                              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '15px' }}>
                                {b.sourceType === 'campus_event' ? b.title : b.bookedBy || b.booked_by}
                                {b.purpose && (
                                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
                                    — {b.purpose}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', marginTop: '3px', fontWeight: 600 }}>
                                📅 {b.date} &nbsp;·&nbsp; ⏰ {b.startTime || b.start_time} – {b.endTime || b.end_time}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--accent-yellow)', marginTop: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                                {b.sourceType === 'campus_event' ? 'Campus Event' : 'Room Booking'}
                              </div>
                            </div>
                            {b.sourceType === 'room_booking' && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleCancelBooking(room.id, b.id || b.booking_id, b.bookedBy || b.booked_by)}
                                title="Cancel this booking"
                              >
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
