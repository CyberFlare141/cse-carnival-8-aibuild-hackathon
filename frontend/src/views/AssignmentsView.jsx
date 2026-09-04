import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { LoadingState, EmptyState } from '../components/StateMessages';

export function AssignmentsView({ onEditItem, onDeleteItem, onAddNew }) {
  const { assignments, loading } = useData();
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const statuses = ['All', 'Pending', 'Submitted', 'Graded', 'Late'];

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const matchStatus =
        selectedStatus === 'All' || item.status?.toLowerCase() === selectedStatus.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.course?.toLowerCase().includes(query) ||
        item.title?.toLowerCase().includes(query) ||
        item.course_title?.toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });
  }, [assignments, selectedStatus, searchQuery]);

  if (loading.assignments && assignments.length === 0) {
    return <LoadingState message="Accessing academic coursework log, deadlines, and grade records..." />;
  }

  return (
    <div className="board-workspace">
      <div className="workspace-toolbar">
        <div className="toolbar-group">
          <div className="filter-tabs">
            {statuses.map((status) => (
              <button
                key={status}
                type="button"
                className={`filter-tab ${selectedStatus === status ? 'active' : ''}`}
                onClick={() => setSelectedStatus(status)}
              >
                {status}
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
              placeholder="Search course code or assignment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <EmptyState
          title="No Coursework Recorded"
          description={
            searchQuery || selectedStatus !== 'All'
              ? 'No assignments match the selected status filter.'
              : 'You have no coursework or assignment deadlines logged.'
          }
          actionText="Record Assignment"
          onAction={onAddNew}
        />
      ) : (
        <div className="ledger-sheet record-animated">
          <table className="ledger-table">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Course</th>
                <th>Assignment Title & Details</th>
                <th style={{ width: '140px' }}>Deadline</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '100px' }}>Score</th>
                <th style={{ width: '160px' }}>Platform</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((item, idx) => {
                const statusLower = (item.status || 'pending').toLowerCase();
                const stampClass =
                  statusLower === 'late'
                    ? 'stamp-late'
                    : statusLower === 'graded'
                    ? 'stamp-graded'
                    : statusLower === 'submitted'
                    ? 'stamp-submitted'
                    : 'stamp-pending';

                return (
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
                      <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '15px' }}>{item.title}</div>
                      {item.course_title && (
                        <div style={{ fontSize: '12px', color: 'var(--accent-yellow)', fontWeight: 600 }}>
                          {item.course_title}
                        </div>
                      )}
                      {item.description && (
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                        📅 {item.deadline}
                      </span>
                    </td>
                    <td>
                      <span className={`stamp ${stampClass}`}>
                        {item.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                        {item.marks != null ? `${item.marks} pts` : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {item.submission_platform || 'Portal'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditItem(item)}
                          title="Edit assignment"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => onDeleteItem(item)}
                          title="Delete assignment"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
