import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { LoadingState, EmptyState } from '../components/StateMessages';

export function ScheduleView({ onEditItem, onDeleteItem, onAddNew }) {
  const { schedule, loading } = useData();
  const [selectedDay, setSelectedDay] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const days = ['All', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  const filteredSchedule = useMemo(() => {
    return schedule.filter((item) => {
      const matchDay = selectedDay === 'All' || item.day?.toLowerCase() === selectedDay.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.course?.toLowerCase().includes(query) ||
        item.title?.toLowerCase().includes(query) ||
        item.instructor?.toLowerCase().includes(query) ||
        item.room?.toLowerCase().includes(query);
      return matchDay && matchSearch;
    });
  }, [schedule, selectedDay, searchQuery]);

  if (loading.schedule && schedule.length === 0) {
    return <LoadingState message="Accessing class timetable registries for all university departments..." />;
  }

  return (
    <div className="board-workspace">
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <div className="filter-tabs">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                className={`filter-tab ${selectedDay === day ? 'active' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
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
              placeholder="Search course, instructor, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredSchedule.length === 0 ? (
        <EmptyState
          title="No Class Sessions Scheduled"
          description={
            searchQuery || selectedDay !== 'All'
              ? 'No classes match your current day filter or search term.'
              : 'The timetable registry is currently empty. Use the button below to schedule a lecture.'
          }
          actionText="Schedule a Class"
          onAction={onAddNew}
        />
      ) : (
        <div className="ledger-sheet record-animated">
          <table className="ledger-table">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Course</th>
                <th>Subject & Section</th>
                <th style={{ width: '120px' }}>Day</th>
                <th style={{ width: '150px' }}>Time Slot</th>
                <th style={{ width: '110px' }}>Room</th>
                <th>Instructor</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedule.map((item, idx) => (
                <tr key={item.id}>
                  <td>
                    <span
                      className="code-badge"
                      style={{
                        borderColor: idx % 2 === 0 ? 'var(--accent-cyan)' : 'var(--accent-magenta)',
                        color: idx % 2 === 0 ? 'var(--accent-cyan)' : 'var(--accent-magenta)',
                        boxShadow: idx % 2 === 0 ? '2px 2px 0 var(--accent-cyan)' : '2px 2px 0 var(--accent-magenta)',
                      }}
                    >
                      {item.course}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '15px' }}>
                      {item.title || item.course}
                    </div>
                    {item.section && (
                      <span style={{ fontSize: '12px', color: 'var(--accent-yellow)', fontWeight: 700 }}>
                        Section: {item.section}
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{item.day}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#ffffff', fontWeight: 700 }}>
                      {item.time || `${item.start_time} - ${item.end_time}`}
                    </span>
                  </td>
                  <td>
                    <span
                      className="code-badge"
                      style={{
                        borderColor: 'var(--accent-yellow)',
                        color: 'var(--accent-yellow)',
                        boxShadow: '2px 2px 0 var(--accent-yellow)',
                      }}
                    >
                      {item.room}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                      {item.instructor || 'TBA'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEditItem(item)}
                        title="Edit class"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => onDeleteItem(item)}
                        title="Delete class"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
