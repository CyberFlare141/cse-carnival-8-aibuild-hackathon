import React, { useState, useEffect } from 'react';

export function RecordModal({ isOpen, mode = 'add', section, initialData = null, onClose, onSave }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setFormData({});
      setValidationError('');
      setSubmitting(false);
      return;
    }

    if (initialData) {
      // Clone initial data
      const data = { ...initialData };
      if (Array.isArray(data.equipment)) {
        data.equipment = data.equipment.join(', ');
      }
      setFormData(data);
    } else {
      // Defaults based on section
      switch (section) {
        case 'schedule':
          setFormData({
            course: '',
            title: '',
            day: 'Sunday',
            time: '08:00 - 09:15',
            room: '7A01',
            instructor: '',
            section: 'A',
          });
          break;
        case 'rooms':
          setFormData({
            roomNumber: '',
            capacity: 40,
            equipment: 'projector, whiteboard, AC',
            floor: 7,
            type: 'classroom',
            status: 'available',
          });
          break;
        case 'events':
          setFormData({
            name: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            time: '14:00 - 16:00',
            venue: '7C01',
            organizer: 'CSE Department',
            capacity: 50,
            status: 'upcoming',
          });
          break;
        case 'announcements':
          setFormData({
            title: '',
            body: '',
            date: new Date().toISOString().split('T')[0],
            priority: 'medium',
            posted_by: 'Department Office',
            expires: '',
          });
          break;
        case 'assignments':
          setFormData({
            course: 'CSE ',
            title: '',
            deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            status: 'pending',
            marks: 100,
            submission_platform: 'Campus Portal',
            description: '',
          });
          break;
        default:
          setFormData({});
      }
    }
  }, [isOpen, initialData, section]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // Quick basic validation
    if (section === 'schedule' && (!formData.course || !formData.day || !formData.room)) {
      setValidationError('Please specify course code, day, and room.');
      setShakeKey((k) => k + 1);
      return;
    }
    if (section === 'rooms' && !formData.roomNumber) {
      setValidationError('Please provide a room number (e.g. 7A01).');
      setShakeKey((k) => k + 1);
      return;
    }
    if (section === 'events' && (!formData.name || !formData.date)) {
      setValidationError('Please provide an event name and date.');
      setShakeKey((k) => k + 1);
      return;
    }
    if (section === 'announcements' && (!formData.title || !formData.body)) {
      setValidationError('Please provide both announcement headline and body text.');
      setShakeKey((k) => k + 1);
      return;
    }
    if (section === 'assignments' && (!formData.course || !formData.title || !formData.deadline)) {
      setValidationError('Please provide course code, assignment title, and deadline.');
      setShakeKey((k) => k + 1);
      return;
    }

    try {
      setSubmitting(true);
      const payload = { ...formData };
      if (section === 'rooms' && typeof payload.equipment === 'string') {
        payload.equipment = payload.equipment
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      setValidationError(err.message || 'Error saving record to backend');
    } finally {
      setSubmitting(false);
    }
  };

  const titles = {
    schedule: mode === 'add' ? '⚡ Add Schedule Entry' : '⚡ Edit Schedule Entry',
    rooms: mode === 'add' ? '⚡ Register New Room' : '⚡ Edit Room Details',
    events: mode === 'add' ? '⚡ Post Campus Event' : '⚡ Edit Event Details',
    announcements: mode === 'add' ? '⚡ Pin New Notice' : '⚡ Edit Notice',
    assignments: mode === 'add' ? '⚡ Record Assignment' : '⚡ Edit Assignment',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-modal-title"
      >
        <div className="modal-header">
          <h3 id="record-modal-title" className="modal-title">
            {titles[section] || 'Record Dossier'}
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            {validationError && (
              <div
                key={shakeKey}
                className="shake"
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'rgba(255, 107, 53, 0.15)',
                  color: 'var(--accent-orange)',
                  borderRadius: 'var(--radius-container)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  border: '2px solid var(--accent-orange)',
                  boxShadow: '0 0 12px rgba(255, 107, 53, 0.3)',
                }}
              >
                ⚠️ {validationError}
              </div>
            )}

            {/* SCHEDULE FIELDS */}
            {section === 'schedule' && (
              <>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Course Code *</label>
                    <input
                      type="text"
                      name="course"
                      className="form-input"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                      placeholder="e.g. CSE 4113"
                      value={formData.course || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <input
                      type="text"
                      name="section"
                      className="form-input"
                      placeholder="e.g. B or CS"
                      value={formData.section || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Course Title</label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    placeholder="e.g. Pattern Recognition"
                    value={formData.title || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Day *</label>
                    <select name="day" className="form-select" value={formData.day || 'Sunday'} onChange={handleChange}>
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time Window *</label>
                    <input
                      type="text"
                      name="time"
                      className="form-input"
                      placeholder="e.g. 13:00 - 14:40"
                      value={formData.time || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Room Number *</label>
                    <input
                      type="text"
                      name="room"
                      className="form-input"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                      placeholder="e.g. 7A07"
                      value={formData.room || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Instructor</label>
                    <input
                      type="text"
                      name="instructor"
                      className="form-input"
                      placeholder="e.g. Prof. Dr. Mahbub"
                      value={formData.instructor || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ROOMS FIELDS */}
            {section === 'rooms' && (
              <>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Room Number *</label>
                    <input
                      type="text"
                      name="roomNumber"
                      className="form-input"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                      placeholder="e.g. 7A04"
                      value={formData.roomNumber || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Capacity (Seats) *</label>
                    <input
                      type="number"
                      name="capacity"
                      className="form-input"
                      min="1"
                      value={formData.capacity ?? 40}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Room Type</label>
                    <select
                      name="type"
                      className="form-select"
                      value={formData.type || 'classroom'}
                      onChange={handleChange}
                    >
                      <option value="classroom">Classroom</option>
                      <option value="lab">Computer Lab</option>
                      <option value="seminar">Seminar Hall</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Floor Number</label>
                    <input
                      type="number"
                      name="floor"
                      className="form-input"
                      value={formData.floor ?? 7}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Equipment (comma separated)</label>
                  <input
                    type="text"
                    name="equipment"
                    className="form-input"
                    placeholder="projector, whiteboard, AC, smart board"
                    value={formData.equipment || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Availability Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={formData.status || 'available'}
                    onChange={handleChange}
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable / Maintenance</option>
                  </select>
                </div>
              </>
            )}

            {/* EVENTS FIELDS */}
            {section === 'events' && (
              <>
                <div className="form-group">
                  <label className="form-label">Event Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="e.g. AI Build Hackathon"
                    value={formData.name || ''}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder="Provide event details, schedule, or topics..."
                    value={formData.description || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Event Date *</label>
                    <input
                      type="date"
                      name="date"
                      className="form-input"
                      value={formData.date || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time Window</label>
                    <input
                      type="text"
                      name="time"
                      className="form-input"
                      placeholder="e.g. 10:00 - 13:00"
                      value={formData.time || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Venue (Room)</label>
                    <input
                      type="text"
                      name="venue"
                      className="form-input"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                      placeholder="e.g. 7C01"
                      value={formData.venue || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Capacity Limit</label>
                    <input
                      type="number"
                      name="capacity"
                      className="form-input"
                      min="1"
                      value={formData.capacity ?? 60}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Organizer</label>
                    <input
                      type="text"
                      name="organizer"
                      className="form-input"
                      placeholder="e.g. AUSTPIC"
                      value={formData.organizer || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status || 'upcoming'}
                      onChange={handleChange}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ANNOUNCEMENTS FIELDS */}
            {section === 'announcements' && (
              <>
                <div className="form-group">
                  <label className="form-label">Headline / Title *</label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    placeholder="e.g. CSE321 Class Relocated to Room 304"
                    value={formData.title || ''}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notice Body Text *</label>
                  <textarea
                    name="body"
                    className="form-textarea"
                    rows="4"
                    placeholder="Write the full notice or instruction here..."
                    value={formData.body || ''}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Priority Level *</label>
                    <select
                      name="priority"
                      className="form-select"
                      value={formData.priority || 'medium'}
                      onChange={handleChange}
                    >
                      <option value="high">High Priority (Urgent)</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority (General)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Posted</label>
                    <input
                      type="date"
                      name="date"
                      className="form-input"
                      value={formData.date || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Posted By</label>
                    <input
                      type="text"
                      name="posted_by"
                      className="form-input"
                      placeholder="e.g. Head of CSE Dept"
                      value={formData.posted_by || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      name="expires"
                      className="form-input"
                      value={formData.expires || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ASSIGNMENTS FIELDS */}
            {section === 'assignments' && (
              <>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Course Code *</label>
                    <input
                      type="text"
                      name="course"
                      className="form-input"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                      placeholder="e.g. CSE 4113"
                      value={formData.course || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Title</label>
                    <input
                      type="text"
                      name="course_title"
                      className="form-input"
                      placeholder="e.g. Pattern Recognition"
                      value={formData.course_title || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assignment Title *</label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    placeholder="e.g. Lab Report 1: Bayes Classifier"
                    value={formData.title || ''}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Tasks</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder="Submission guidelines, repository links, criteria..."
                    value={formData.description || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Submission Deadline *</label>
                    <input
                      type="date"
                      name="deadline"
                      className="form-input"
                      value={formData.deadline || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status || 'pending'}
                      onChange={handleChange}
                    >
                      <option value="pending">Pending</option>
                      <option value="submitted">Submitted</option>
                      <option value="graded">Graded</option>
                      <option value="late">Late</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Marks / Score</label>
                    <input
                      type="number"
                      name="marks"
                      className="form-input"
                      value={formData.marks ?? 100}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Submission Platform</label>
                    <input
                      type="text"
                      name="submission_platform"
                      className="form-input"
                      placeholder="e.g. Google Classroom"
                      value={formData.submission_platform || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving Record...' : mode === 'add' ? '⚡ Post Record' : '⚡ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
