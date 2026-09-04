import React, { useState, useEffect } from 'react';

/**
 * Action modal for Room Booking or Event Registration
 */
export function ActionModal({ isOpen, type, targetItem, onClose, onConfirm }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setFormData({});
      setError('');
      setSubmitting(false);
      return;
    }

    if (type === 'book-room') {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        date: today,
        startTime: '13:00',
        endTime: '14:40',
        bookedBy: '',
        purpose: 'Study & Discussion Session',
      });
    } else if (type === 'register-event') {
      setFormData({
        name: '',
      });
    }
  }, [isOpen, type]);

  if (!isOpen || !targetItem) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (type === 'book-room') {
      if (!formData.bookedBy || !formData.date || !formData.startTime || !formData.endTime) {
        setError('Please complete all booking fields.');
        return;
      }
    } else if (type === 'register-event') {
      if (!formData.name?.trim()) {
        setError('Please enter student name for event registration.');
        return;
      }
    }

    try {
      setSubmitting(true);
      await onConfirm(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Action failed on server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-modal-title"
      >
        <div className="modal-header">
          <h3 id="action-modal-title" className="modal-title">
            {type === 'book-room'
              ? `⚡ Book Room ${targetItem.roomNumber}`
              : `⚡ Register for ${targetItem.name}`}
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            {error && (
              <div
                className="modal-error-message"
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 107, 53, 0.15)',
                  color: 'var(--accent-orange)',
                  borderRadius: 'var(--radius-container)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  border: '2px solid var(--accent-orange)',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {type === 'book-room' && (
              <>
                <div className="form-group">
                  <label className="form-label">Booked By (Student or Organization) *</label>
                  <input
                    type="text"
                    name="bookedBy"
                    className="form-input"
                    placeholder="e.g. Sakibul Hassan or Robotics Club"
                    value={formData.bookedBy || ''}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reservation Date *</label>
                  <input
                    type="date"
                    name="date"
                    className="form-input"
                    value={formData.date || ''}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input
                      type="time"
                      name="startTime"
                      className="form-input"
                      value={formData.startTime || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input
                      type="time"
                      name="endTime"
                      className="form-input"
                      value={formData.endTime || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Purpose / Session Details</label>
                  <input
                    type="text"
                    name="purpose"
                    className="form-input"
                    placeholder="e.g. Group Study / Lab Project"
                    value={formData.purpose || ''}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {type === 'register-event' && (
              <>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Register student name to secure a seat on the attendee roster for this campus event.
                </p>
                <div className="form-group">
                  <label className="form-label">Student Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="e.g. Farhan Ahmed (20-40511)"
                    value={formData.name || ''}
                    onChange={handleChange}
                    autoFocus
                    required
                  />
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? 'Processing...'
                : type === 'book-room'
                ? '⚡ Confirm Booking'
                : '⚡ Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
