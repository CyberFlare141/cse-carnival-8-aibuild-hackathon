import React from 'react';

export function Header({ currentTab, onOpenAddModal, onToggleMobileMenu }) {
  const titles = {
    schedule: {
      title: 'Class Timetable',
      badge: 'Fall 2026',
      subtitle: 'Official academic timetable sorted by weekday with live classroom mapping',
      addBtn: '+ Add Class',
      watermark: 'SCHEDULE',
      accent: 'var(--accent-cyan)',
    },
    rooms: {
      title: 'Room Registry',
      badge: 'Floor 7',
      subtitle: 'Classrooms, computer laboratories, and active room reservations',
      addBtn: '+ Register Room',
      watermark: 'ROOMS',
      accent: 'var(--accent-magenta)',
    },
    events: {
      title: 'Campus Events',
      badge: 'Campus Wide',
      subtitle: 'Hackathons, academic seminars, guest lectures, and attendee rosters',
      addBtn: '+ Post Event',
      watermark: 'EVENTS',
      accent: 'var(--accent-yellow)',
    },
    announcements: {
      title: 'Notice Board',
      badge: 'Bulletins',
      subtitle: 'Departmental memos, urgent class relocations, and official circulars',
      addBtn: '+ Pin Notice',
      watermark: 'NOTICES',
      accent: 'var(--accent-orange)',
    },
    assignments: {
      title: 'Assignments Log',
      badge: 'Evaluations',
      subtitle: 'Coursework submissions, grading status, and upcoming deadlines',
      addBtn: '+ Record Assignment',
      watermark: 'TASKS',
      accent: 'var(--accent-purple)',
    },
    chat: {
      title: 'CampusOS Agent',
      badge: 'Autonomous AI',
      subtitle: 'Live campus intelligence agent with tool execution across campus data',
      addBtn: null,
      watermark: 'AGENT',
      accent: 'var(--accent-cyan)',
    },
  };

  const info = titles[currentTab] || titles.schedule;

  return (
    <header className="board-header">
      {/* Decorative low-opacity watermark typography */}
      <div className="watermark-bg" aria-hidden="true">
        {info.watermark}
      </div>

      <div className="header-meta">
        <div className="header-title-row">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <h1 className="header-title text-shadow-single">{info.title}</h1>
          <span
            className="header-badge"
            style={{
              borderColor: info.accent,
              color: info.accent,
              boxShadow: `0 0 12px ${info.accent}40`,
            }}
          >
            {info.badge}
          </span>
        </div>
        <p className="header-subtitle">{info.subtitle}</p>
      </div>

      <div className="header-actions">
        {info.addBtn && (
          <button type="button" className="btn btn-primary" onClick={onOpenAddModal}>
            <span>⚡</span>
            <span>{info.addBtn}</span>
          </button>
        )}
      </div>
    </header>
  );
}
