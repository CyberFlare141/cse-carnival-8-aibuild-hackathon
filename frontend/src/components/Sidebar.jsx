import React from 'react';
import { useData } from '../context/DataContext';

export function Sidebar({ currentTab, onSelectTab, isMobileOpen, onCloseMobile, onGoToLanding, showLandingLink = true }) {
  const { schedule, rooms, events, announcements, assignments, isBackendOnline, fetchAll } = useData();

  const navItems = [
    { id: 'schedule', label: 'Class Schedule', icon: '🗓️', count: schedule.length, accent: 'var(--accent-cyan)' },
    { id: 'rooms', label: 'Rooms & Venues', icon: '🚪', count: rooms.length, accent: 'var(--accent-magenta)' },
    { id: 'events', label: 'Campus Events', icon: '📢', count: events.length, accent: 'var(--accent-yellow)' },
    { id: 'announcements', label: 'Notice Bulletins', icon: '📌', count: announcements.length, accent: 'var(--accent-orange)' },
    { id: 'assignments', label: 'Assignments Log', icon: '📝', count: assignments.length, accent: 'var(--accent-purple)' },
    { id: 'chat', label: 'Agent Intelligence', icon: '✦', count: null, accent: 'var(--accent-cyan)' },
  ];

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-masthead">
        <div
          className="masthead-emblem"
          onClick={onGoToLanding}
          style={{ cursor: onGoToLanding ? 'pointer' : 'default' }}
          title={onGoToLanding ? 'Go to Public Landing Page' : undefined}
        >
          <div className="masthead-seal">C</div>
          <span className="masthead-title">CampusOS</span>
        </div>
        <div className="masthead-subtitle">
          <span>✦</span>
          <span>AUST Academic Engine</span>
          <span>✦</span>
        </div>

        {onGoToLanding && showLandingLink && (
          <button
            type="button"
            onClick={onGoToLanding}
            style={{
              marginTop: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1.5px solid var(--accent-purple)',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--accent-cyan)',
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.04em',
              transition: 'all 0.15s ease',
            }}
            title="Back"
          >
            <span>←</span>
            <span>Back</span>
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">
          <span>⚡</span>
          <span>DASHBOARD PORTALS</span>
        </div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              style={{
                borderColor: isActive ? item.accent : undefined,
              }}
            >
              <div className="nav-item-content">
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.count !== null && (
                <span
                  className="nav-count"
                  style={{
                    borderColor: item.accent,
                    color: isActive ? '#000000' : item.accent,
                  }}
                >
                  {item.count}
                </span>
              )}
              {item.id === 'chat' && (
                <span
                  className="stamp stamp-high"
                  style={{ fontSize: '10px', padding: '2px 8px' }}
                >
                  AI BOT
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="connection-indicator">
          <span
            className={`status-dot ${
              isBackendOnline === true ? 'online' : isBackendOnline === false ? 'offline' : 'checking'
            }`}
          />
          <span style={{ color: isBackendOnline ? 'var(--accent-cyan)' : undefined }}>
            {isBackendOnline === true
              ? 'Registry Connected'
              : isBackendOnline === false
              ? 'Backend Disconnected'
              : 'Connecting...'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => fetchAll()}
          title="Synchronize all ledger data"
          style={{
            marginTop: '10px',
            background: 'none',
            border: 'none',
            color: 'var(--accent-yellow)',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span>↻</span>
          <span>Sync Real-Time Data</span>
        </button>
      </div>
    </aside>
  );
}
