import React, { useState } from 'react';

export function LandingPage({ onOpenApp, onToggleMobileMenu }) {
  const [activeMockTab, setActiveMockTab] = useState('class');

  // Interactive mock agent queries & responses
  const mockScenarios = {
    class: {
      id: 'class',
      label: "Where's my class?",
      question: "Where's my CSE321 class today?",
      reply: "CSE321 (Software Engineering) was moved to 10:30 AM today in Room 304 per this morning's departmental announcement.",
      meta: "📍 Room 304 · Engineering Wing A · Capacity: 45",
      trace: {
        title: "QUERY ANNOUNCEMENTS & TIMETABLE",
        action: "Detected room relocation notice published at 08:30 AM",
      },
    },
    book: {
      id: 'book',
      label: "Book a Room",
      question: "Book Room 302 tomorrow from 3 to 5 PM for Farhan.",
      reply: "I checked the registry — Room 302 is completely free tomorrow between 3:00 PM and 5:00 PM. I've placed the reservation on the room ledger.",
      meta: "🚪 Room 302 · Projector, AC, Whiteboard · Confirmed",
      trace: {
        title: "EXECUTE TOOL: BOOK_ROOM",
        action: "Booked Room 302, 2026-09-08 (15:00–17:00) for Farhan",
      },
    },
    free: {
      id: 'free',
      label: "Free Time on Campus",
      question: "I'm free until 2 PM. Is there anything happening on campus right now?",
      reply: "You have a 2-hour window before CSE 4113 at 14:00. Two campus events match your schedule:",
      meta: "📢 AI Build Hackathon (Room 7C01) & 📢 Robotics Club Showcase (Ground Floor)",
      trace: {
        title: "CROSS-REFERENCE SCHEDULE & EVENTS",
        action: "Found 2 upcoming sessions matching free timetable window",
      },
    },
    due: {
      id: 'due',
      label: "What's Due This Week?",
      question: "What have I got due this week?",
      reply: "You have 2 coursework items approaching their deadlines:",
      meta: "📝 CSE 4114 Lab Report 1 (Due Sunday) & 📝 CSE 4173 Cryptography Task (Due Tuesday)",
      trace: {
        title: "QUERY ASSIGNMENTS LOG",
        action: "Retrieved 2 pending evaluations sorted by deadline",
      },
    },
  };

  const activeScenario = mockScenarios[activeMockTab] || mockScenarios.class;

  return (
    <div className="landing-wrapper">
      {/* ---------------------------------------------------------------------
         LANDING STICKY NAVIGATION
         --------------------------------------------------------------------- */}
      <header className="landing-navbar">
        <button
          type="button"
          className="landing-mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
        <div className="landing-nav-container">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="masthead-seal">C</div>
            <span className="masthead-title">CampusOS</span>
            <span className="header-badge" style={{ fontSize: '10px', padding: '2px 8px' }}>
              AUST
            </span>
          </div>

          <nav className="landing-nav-links">
            <a href="#how-it-works" className="landing-nav-link">
              How It Works
            </a>
            <a href="#agent-demo" className="landing-nav-link">
              Live Agent
            </a>
            <a href="#systems" className="landing-nav-link">
              Campus Systems
            </a>
            <a href="#why-campusos" className="landing-nav-link">
              Why CampusOS
            </a>
          </nav>
        </div>
      </header>

      {/* ---------------------------------------------------------------------
         HERO SECTION: CONCRETE CAMPUS REALITY
         --------------------------------------------------------------------- */}
      <section className="landing-hero">
        <div className="watermark-bg" aria-hidden="true">
          CAMPUS
        </div>

        <div className="landing-hero-grid">
          <div className="landing-hero-content">
            <div className="hero-status-pill">
              <span className="status-dot online" />
              <span>CONNECTED TO LIVE CAMPUS DATA</span>
            </div>

            <h1 className="landing-hero-headline text-shadow-single">
              Your class moved. <br />
              The announcement got buried. <br />
              <span className="text-gradient">Your deadline is tomorrow.</span>
            </h1>

            <p className="landing-hero-subhead">
              CampusOS turns the scattered information of campus life into one intelligent place — and puts
              an AI agent on top of it that can actually understand what's happening and take action.
            </p>

            <div className="landing-hero-cta-group">
              <button type="button" className="btn btn-primary" onClick={onOpenApp} style={{ padding: '14px 32px', fontSize: '16px' }}>
                <span>⚡</span>
                <span>Enter Dashboard</span>
              </button>

              <a href="#agent-demo" className="btn btn-secondary" style={{ padding: '14px 24px' }}>
                <span>See How It Works ↓</span>
              </a>
            </div>

            <div className="hero-metrics-strip">
              <div className="hero-metric-item">
                <span className="metric-val" style={{ color: 'var(--accent-cyan)' }}>
                  5 Systems
                </span>
                <span className="metric-lbl">Synchronized in 1 Place</span>
              </div>
              <div className="hero-metric-divider" />
              <div className="hero-metric-item">
                <span className="metric-val" style={{ color: 'var(--accent-yellow)' }}>
                  0 Guessing
                </span>
                <span className="metric-lbl">Operates on Verified Registry</span>
              </div>
              <div className="hero-metric-divider" />
              <div className="hero-metric-item">
                <span className="metric-val" style={{ color: 'var(--accent-magenta)' }}>
                  Real Actions
                </span>
                <span className="metric-lbl">Books Rooms & Registers RSVPs</span>
              </div>
            </div>
          </div>

          {/* Interactive Agent Mockup */}
          <div className="landing-hero-visual">
            <div className="mock-agent-container record-animated">
              <div className="mock-agent-header">
                <div className="mock-agent-title">
                  <span className="mock-pulse-dot" />
                  <span>CAMPUSOS AGENT · LIVE SYSTEM ACCESS</span>
                </div>
                <span className="code-badge" style={{ fontSize: '10px', padding: '2px 7px' }}>
                  POST /agent/chat
                </span>
              </div>

              {/* Scenario selector tabs */}
              <div className="mock-scenario-tabs">
                {Object.values(mockScenarios).map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    className={`mock-tab-btn ${activeMockTab === sc.id ? 'active' : ''}`}
                    onClick={() => setActiveMockTab(sc.id)}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              {/* Mock Chat Feed */}
              <div className="mock-chat-feed">
                {/* Student Query */}
                <div className="mock-message user">
                  <div className="message-meta">
                    <span>Student</span>
                    <span>·</span>
                    <span>10:14 AM</span>
                  </div>
                  <div className="message-bubble">{activeScenario.question}</div>
                </div>

                {/* Agent Response */}
                <div className="mock-message agent">
                  <div className="message-meta">
                    <span style={{ color: 'var(--accent-yellow)', fontWeight: 900 }}>⚡ CampusOS Agent</span>
                    <span>·</span>
                    <span>Just now</span>
                  </div>

                  {/* Compact Execution Trace */}
                  <div className="tool-call-trace" style={{ margin: '0 0 10px' }}>
                    <div className="tool-trace-title">
                      <span>✦ {activeScenario.trace.title}</span>
                    </div>
                    <div className="tool-trace-item">
                      <span style={{ color: 'var(--accent-cyan)' }}>✓</span>
                      <span>{activeScenario.trace.action}</span>
                    </div>
                  </div>

                  <div className="message-bubble">
                    <p style={{ marginBottom: '8px' }}>{activeScenario.reply}</p>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: 'var(--bg-dark)',
                        border: '1.5px solid var(--accent-cyan)',
                        borderRadius: 'var(--radius-pill)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      {activeScenario.meta}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Input Bar */}
              <div className="mock-input-bar">
                <div className="mock-fake-input">
                  <span>Ask CampusOS anything about your campus day...</span>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={onOpenApp}>
                  ⚡ Try
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
         SIX CONNECTED CAMPUSOS FEATURES
         --------------------------------------------------------------------- */}
      <section id="features" className="landing-section feature-showcase-section">
        <div className="landing-section-header feature-showcase-header">
          <span className="section-eyebrow" style={{ color: 'var(--accent-cyan)' }}>
            ✦ THE CAMPUSOS OPERATING SYSTEM
          </span>
          <h2 className="landing-section-title text-shadow-single">EVERYTHING YOUR CAMPUS NEEDS.</h2>
          <p className="landing-section-subtitle">Six connected systems. One smarter campus.</p>
        </div>

        <div className="feature-editorial-grid">
          <article className="feature-block feature-ai card-accent-0">
            <div className="feature-block-heading">
              <span className="feature-index">01</span>
              <span className="feature-kicker">AI CAMPUS ASSISTANT</span>
            </div>
            <h3>Ask the campus. Get something done.</h3>
            <p className="feature-description">A live agent reads the same timetable, notices, rooms, and events you do.</p>
            <div className="feature-chat-preview">
              <div className="feature-chat-status"><span className="mock-pulse-dot" /> AGENT ONLINE <span>·</span> LIVE DATA</div>
              <div className="feature-chat-message student"><span>STUDENT</span>"Where is my next class?"</div>
              <div className="feature-typing-indicator"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
              <div className="feature-chat-message agent"><span>⚡ CAMPUSOS</span>Room 402 — Engineering Building. You have 12 minutes.</div>
              <button type="button" className="feature-action-link" onClick={() => onOpenApp('chat')}>Try the agent →</button>
            </div>
          </article>

          <article className="feature-block feature-rooms card-accent-1">
            <div className="feature-block-heading"><span className="feature-index">02</span><span className="feature-kicker">SMART ROOM BOOKING</span></div>
            <h3>Find space before the group chat does.</h3>
            <div className="room-feature-ticket">
              <div className="room-feature-top"><span className="room-number-tag">ROOM 402</span><span className="feature-live-status"><span className="status-dot online" /> AVAILABLE</span></div>
              <div className="room-feature-time">09:00 <span>—</span> 10:00</div>
              <div className="room-feature-meta">Engineering Building · Projector · 40 seats</div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpenApp('rooms')}>BOOK ROOM <span>→</span></button>
            </div>
          </article>

          <article className="feature-block feature-events card-accent-2">
            <div className="feature-block-heading"><span className="feature-index">03</span><span className="feature-kicker">CAMPUS EVENTS</span></div>
            <div className="event-feature-ticket">
              <div className="event-feature-date"><strong>12</strong><span>SEP</span></div>
              <div className="event-feature-details"><span className="stamp stamp-available">WORKSHOP</span><h3>AI &amp; ROBOTICS WORKSHOP</h3><p>Engineering Building <span>·</span> 3:00 PM</p></div>
            </div>
            <button type="button" className="feature-action-link" onClick={() => onOpenApp('events')}>See campus events →</button>
          </article>

          <article className="feature-block feature-notices card-accent-3">
            <div className="feature-block-heading"><span className="feature-index">04</span><span className="feature-kicker">ANNOUNCEMENTS</span><span className="feature-notification-badge">NEW</span></div>
            <div className="notice-feature-paper"><div className="notice-feature-meta"><span className="stamp stamp-high">IMPORTANT</span><span>12 SEP 2026</span></div><h3>Midterm examination schedule has been published.</h3><p>Department Office · Academic Registry</p></div>
            <button type="button" className="feature-action-link" onClick={() => onOpenApp('announcements')}>Read the notice board →</button>
          </article>

          <article className="feature-block feature-assignments card-accent-4">
            <div className="feature-block-heading"><span className="feature-index">05</span><span className="feature-kicker">ASSIGNMENTS &amp; ACADEMIC TRACKING</span></div>
            <h3>Deadlines, without the dread spiral.</h3>
            <div className="assignment-feature-row"><div><span className="code-badge">CSE 310</span><strong>Operating Systems Assignment</strong><span className="assignment-deadline">Due: Tomorrow, 11:59 PM</span></div><span className="stamp stamp-pending">HIGH</span></div>
            <div className="feature-progress-label"><span>Progress</span><strong>80%</strong></div><div className="feature-progress-track"><div className="feature-progress-value" /></div>
            <button type="button" className="feature-action-link" onClick={() => onOpenApp('assignments')}>Open assignments →</button>
          </article>

          <article className="feature-block feature-dashboard card-accent-mixed">
            <div className="feature-block-heading"><span className="feature-index">06</span><span className="feature-kicker">STUDENT CAMPUS DASHBOARD</span></div>
            <h3>Your whole campus day, in one glance.</h3>
            <div className="dashboard-feature-shell">
              <div className="dashboard-feature-top"><div><span className="dashboard-avatar">FH</span><span><strong>Farhan Hassan</strong><small>CSE · Year 4</small></span></div><span className="feature-live-status"><span className="status-dot online" /> SYNCED</span></div>
              <div className="dashboard-feature-widgets"><div><small>NEXT CLASS</small><strong>CSE 321</strong><span>10:30 · Room 304</span></div><div><small>ATTENDANCE</small><strong>92%</strong><span className="dashboard-meter"><i /></span></div><div><small>ALERTS</small><strong>03</strong><span>2 tasks · 1 notice</span></div></div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenApp('schedule')}>OPEN MY DASHBOARD <span>→</span></button>
            </div>
          </article>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
         08. HOW CAMPUSOS WORKS (3 CONCRETE STEPS)
         --------------------------------------------------------------------- */}
      <section id="how-it-works" className="landing-section">
        <div className="landing-section-header">
          <span className="section-eyebrow" style={{ color: 'var(--accent-cyan)' }}>
            ✦ THE CAMPUS INTELLIGENCE WORKFLOW
          </span>
          <h2 className="landing-section-title text-shadow-single">How CampusOS Works</h2>
          <p className="landing-section-subtitle">
            Most campus software stops at displaying static tables. CampusOS connects all 5 campus registries to an
            autonomous execution agent.
          </p>
        </div>

        <div className="three-steps-grid">
          {/* Step 1 */}
          <div className="step-card card-accent-0">
            <div className="step-number" style={{ color: 'var(--accent-magenta)' }}>
              01
            </div>
            <h3 className="step-heading">Everything in One Place</h3>
            <p className="step-text">
              Class schedules, room capacities, campus events, departmental announcements, and assignment deadlines
              all live in a unified, synchronized registry. No more searching through group chats, emails, and PDFs.
            </p>
            <div className="step-badge-list">
              <span className="code-badge">Schedule</span>
              <span className="code-badge">Rooms</span>
              <span className="code-badge">Events</span>
              <span className="code-badge">Notices</span>
              <span className="code-badge">Tasks</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-card card-accent-1">
            <div className="step-number" style={{ color: 'var(--accent-cyan)' }}>
              02
            </div>
            <h3 className="step-heading">It Stays Current</h3>
            <p className="step-text">
              When someone changes a class time, books a computer lab, or updates an announcement, that change is
              saved immediately to the live registry. The agent reads the exact same state you see on your screen.
            </p>
            <div className="step-badge-list">
              <span className="stamp stamp-available">Live Sync</span>
              <span className="stamp stamp-high">Zero Stale State</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-card card-accent-2">
            <div className="step-number" style={{ color: 'var(--accent-yellow)' }}>
              03
            </div>
            <h3 className="step-heading">The Agent Can Use It</h3>
            <p className="step-text">
              This isn't a toy chatbot reciting scripted generic answers. CampusOS calls real tools across the data: it
              checks room availability, books slots, registers student RSVPs, and resolves class relocations instantly.
            </p>
            <div className="step-badge-list">
              <span className="code-badge" style={{ borderColor: 'var(--accent-yellow)', color: 'var(--accent-yellow)' }}>
                Tool Execution
              </span>
              <span className="code-badge" style={{ borderColor: 'var(--accent-magenta)', color: 'var(--accent-magenta)' }}>
                Action Verified
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
         09. WHAT THE AGENT CAN ACTUALLY DO (INTERACTIVE SCENARIOS)
         --------------------------------------------------------------------- */}
      <section id="agent-demo" className="landing-section" style={{ background: 'rgba(20, 14, 43, 0.4)' }}>
        <div className="landing-section-header">
          <span className="section-eyebrow" style={{ color: 'var(--accent-yellow)' }}>
            ✦ REAL STUDENT CONVERSATIONS
          </span>
          <h2 className="landing-section-title text-shadow-single">What the Agent Can Actually Do</h2>
          <p className="landing-section-subtitle">
            Not ordinary feature bullet points — here is how CampusOS handles real everyday questions on a chaotic
            campus day.
          </p>
        </div>

        <div className="conversations-grid">
          {/* Card 1 */}
          <div className="conversation-card card-accent-0">
            <div className="conv-user-prompt">
              <span className="conv-role">Student</span>
              <p className="conv-message">"Where's my CSE321 class today?"</p>
            </div>
            <div className="conv-divider" />
            <div className="conv-agent-response">
              <span className="conv-role agent">⚡ CampusOS</span>
              <div className="tool-call-trace" style={{ padding: '6px 12px', margin: '4px 0 8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: 800 }}>
                  ✓ Checked notice board: Relocation memo found
                </span>
              </div>
              <p className="conv-message">
                "CSE321 has been relocated to <strong style={{ color: 'var(--accent-cyan)' }}>Room 304</strong> at{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>10:30 AM</span> in the Engineering Building."
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="conversation-card card-accent-1">
            <div className="conv-user-prompt">
              <span className="conv-role">Student</span>
              <p className="conv-message">"I'm free until 2. Anything happening on campus?"</p>
            </div>
            <div className="conv-divider" />
            <div className="conv-agent-response">
              <span className="conv-role agent">⚡ CampusOS</span>
              <div className="tool-call-trace" style={{ padding: '6px 12px', margin: '4px 0 8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: 800 }}>
                  ✓ Cross-referenced schedule timetable with 7 events
                </span>
              </div>
              <p className="conv-message">
                "You have 2 hours free. Drop into the{' '}
                <strong style={{ color: 'var(--accent-yellow)' }}>Robotics Club Demo</strong> in Room 7C01 (ends 1:30
                PM) or the Career Talk in 7C05."
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="conversation-card card-accent-2">
            <div className="conv-user-prompt">
              <span className="conv-role">Student</span>
              <p className="conv-message">"Book Room 302 tomorrow, 3–5 PM."</p>
            </div>
            <div className="conv-divider" />
            <div className="conv-agent-response">
              <span className="conv-role agent">⚡ CampusOS</span>
              <div className="tool-call-trace" style={{ padding: '6px 12px', margin: '4px 0 8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 800 }}>
                  ✓ Action: Booked Room 302 for Tomorrow, 3–5 PM
                </span>
              </div>
              <p className="conv-message">
                "Room 302 was free and has been confirmed under your name on the facility ledger. Booking ref:{' '}
                <code style={{ color: 'var(--accent-magenta)' }}>bk-802</code>."
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="conversation-card card-accent-3">
            <div className="conv-user-prompt">
              <span className="conv-role">Student</span>
              <p className="conv-message">"What have I got due this week?"</p>
            </div>
            <div className="conv-divider" />
            <div className="conv-agent-response">
              <span className="conv-role agent">⚡ CampusOS</span>
              <div className="tool-call-trace" style={{ padding: '6px 12px', margin: '4px 0 8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: 800 }}>
                  ✓ Filtered coursework by approaching deadline
                </span>
              </div>
              <p className="conv-message">
                "You have 2 items due: <strong style={{ color: 'var(--accent-orange)' }}>CSE 4114 Lab Report 1</strong>{' '}
                (Sunday) and <strong style={{ color: 'var(--accent-yellow)' }}>CSE 4173 Cryptography</strong> (Tuesday)."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
         10. THE FIVE CAMPUS SYSTEMS (FRAGMENTED DASHBOARD SHOWCASE)
         --------------------------------------------------------------------- */}
      <section id="systems" className="landing-section">
        <div className="landing-section-header">
          <span className="section-eyebrow" style={{ color: 'var(--accent-magenta)' }}>
            ✦ UNIFIED CAMPUS REGISTRIES
          </span>
          <h2 className="landing-section-title text-shadow-single">Five Systems. One Single Board.</h2>
          <p className="landing-section-subtitle">
            Not five identical cards. Each system is designed around how students actually check and act on that
            information.
          </p>
        </div>

        <div className="systems-visual-grid">
          {/* 1. Schedule Fragment */}
          <div className="system-fragment card-accent-0">
            <div className="fragment-badge">01 · SCHEDULE</div>
            <h3 className="fragment-title">Timetable Engine</h3>
            <p className="fragment-desc">Real-time weekly class lectures, labs, room assignments, and instructors.</p>
            <div className="fragment-preview-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="code-badge">CSE 4113</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)' }}>
                  13:00 – 14:40
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Pattern Recognition Lab</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                📍 Room 7A07 · Prof. Dr. Mahbub
              </div>
            </div>
          </div>

          {/* 2. Rooms Fragment */}
          <div className="system-fragment card-accent-1">
            <div className="fragment-badge">02 · ROOMS</div>
            <h3 className="fragment-title">Facility & Lab Registry</h3>
            <p className="fragment-desc">Capacity manifests, equipment lists (projector, AC), and live reservations.</p>
            <div className="fragment-preview-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="room-number-tag" style={{ fontSize: '16px', padding: '2px 8px' }}>
                  7A02
                </span>
                <span className="stamp stamp-available">AVAILABLE</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--accent-yellow)', marginTop: '8px', fontWeight: 600 }}>
                Capacity: 40 seats · Projector, Whiteboard, AC
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Next booked: 3:00 PM (Study Session)
              </div>
            </div>
          </div>

          {/* 3. Events Fragment */}
          <div className="system-fragment card-accent-2">
            <div className="fragment-badge">03 · EVENTS</div>
            <h3 className="fragment-title">Campus Events Gazette</h3>
            <p className="fragment-desc">Hackathons, guest lectures, attendee rosters, and capacity meters.</p>
            <div className="fragment-preview-box">
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '14px' }}>AUSTPIC AI Build Hackathon</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0' }}>
                📅 2026-09-10 · 📍 Room 7C01
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                47 / 60 Registered (78% Full)
              </div>
            </div>
          </div>

          {/* 4. Announcements Fragment */}
          <div className="system-fragment card-accent-3">
            <div className="fragment-badge">04 · NOTICES</div>
            <h3 className="fragment-title">Department Notice Board</h3>
            <p className="fragment-desc">Urgent memos, room changes, and priority circulars with expiry tracking.</p>
            <div className="fragment-preview-box" style={{ borderLeft: '4px solid var(--accent-magenta)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="stamp stamp-high" style={{ fontSize: '10px' }}>
                  URGENT
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Today</span>
              </div>
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '13px', marginTop: '6px' }}>
                CSE321 Relocated to Room 304
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Posted by Department Head
              </div>
            </div>
          </div>

          {/* 5. Assignments Fragment */}
          <div className="system-fragment card-accent-4">
            <div className="fragment-badge">05 · ASSIGNMENTS</div>
            <h3 className="fragment-title">Coursework Tracker</h3>
            <p className="fragment-desc">Submission deadlines, mark weights, platforms, and evaluation status.</p>
            <div className="fragment-preview-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="code-badge">CSE 4114</span>
                <span className="stamp stamp-pending">PENDING</span>
              </div>
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '13px', marginTop: '6px' }}>
                Lab Report 1: Bayes Classifier
              </div>
              <div style={{ fontSize: '12px', color: 'var(--accent-orange)', fontWeight: 700, marginTop: '2px' }}>
                ⏳ Deadline: Sep 7 (100 pts)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
         11. NOT JUST ANOTHER CHATBOT (COMPARISON)
         --------------------------------------------------------------------- */}
      <section id="why-campusos" className="landing-section" style={{ background: 'rgba(20, 14, 43, 0.4)' }}>
        <div className="landing-section-header">
          <span className="section-eyebrow" style={{ color: 'var(--accent-orange)' }}>
            ✦ THE ACTION ADVANTAGE
          </span>
          <h2 className="landing-section-title text-shadow-single">
            It doesn't just answer. It knows what's happening on campus.
          </h2>
          <p className="landing-section-subtitle">
            A generic chatbot gives you a paragraph of generic advice. CampusOS checks the live campus data, finds the
            answer, and actually takes action for you.
          </p>
        </div>

        <div className="comparison-grid">
          {/* Generic Chatbot */}
          <div className="comparison-column generic">
            <div className="comparison-header">
              <span className="comparison-tag generic">GENERIC CHATBOT</span>
              <h3>Passive FAQ Assistant</h3>
            </div>
            <div className="comparison-bubble generic">
              <p className="comparison-quote">
                "Room reservations at universities are typically managed through your student portal or by contacting
                the facility coordinator during normal business hours. Please refer to your student handbook for
                further policy details."
              </p>
              <div className="comparison-verdict" style={{ color: 'var(--accent-orange)' }}>
                ✕ Only Text & Guesswork
              </div>
            </div>
            <ul className="comparison-points">
              <li>Has no access to real class schedules</li>
              <li>Cannot tell if Room 302 is occupied right now</li>
              <li>Cannot book a room or take actions</li>
              <li>Leaves the student to do all the work</li>
            </ul>
          </div>

          {/* CampusOS */}
          <div className="comparison-column campusos">
            <div className="comparison-header">
              <span className="comparison-tag campusos">CAMPUSOS INTELLIGENCE</span>
              <h3 style={{ color: 'var(--accent-yellow)' }}>Autonomous Campus Agent</h3>
            </div>
            <div className="comparison-bubble campusos">
              <p className="comparison-quote">
                "I checked Room 302 on the facility ledger. It is completely available tomorrow between 3:00 PM and
                5:00 PM. Would you like me to reserve it under your name right now?"
              </p>
              <div className="comparison-verdict" style={{ color: 'var(--accent-cyan)' }}>
                ✓ Live Data + Real Tool Execution
              </div>
            </div>
            <ul className="comparison-points">
              <li>Reads the live university timetable & room registry</li>
              <li>Knows room changes within seconds of announcement</li>
              <li>Executes bookings and event registrations directly</li>
              <li>Stays synchronized across the entire dashboard</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
         12. TRUST & CREDIBILITY
         --------------------------------------------------------------------- */}
      <section className="landing-section" style={{ borderBottom: 'none', paddingBottom: '30px' }}>
        <div className="trust-card card-accent-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>🏛️</span>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>
              Built around the information students actually need every day.
            </h3>
          </div>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto', fontSize: '15px', lineHeight: '1.6' }}>
            Built for AUST university life — class timetables, rooms 7A01–7C05, departmental notices, and coursework
            deadlines. Every response is verified against the real campus backend.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
         13. FINAL CLOSING CTA
         --------------------------------------------------------------------- */}
      <section className="landing-closing-cta">
        <div className="closing-cta-sheet card-accent-0 record-animated">
          <div className="watermark-bg" aria-hidden="true" style={{ fontSize: '18vw', top: '-20px' }}>
            READY
          </div>

          <h2 className="closing-cta-headline text-shadow-double">
            YOUR CAMPUS. <br />
            <span className="text-gradient">FINALLY CONNECTED.</span>
          </h2>

          <p className="closing-cta-subhead">
            Everything you need to navigate, organize, and experience campus life — in one place.
          </p>

          <div className="closing-cta-actions">
            <button type="button" className="btn btn-primary" onClick={() => onOpenApp()} style={{ padding: '16px 40px', fontSize: '18px' }}>
              <span>⚡</span><span>GET STARTED →</span>
            </button>
            <a href="#features" className="btn btn-secondary" style={{ padding: '16px 28px', fontSize: '16px' }}>
              <span>EXPLORE CAMPUS →</span>
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------
         FOOTER
         --------------------------------------------------------------------- */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="footer-brand">
            <div className="masthead-seal">C</div>
            <span className="masthead-title" style={{ fontSize: '20px' }}>
              CampusOS
            </span>
          </div>
          <div className="footer-nav">
            <button type="button" className="footer-link" onClick={() => onOpenApp('schedule')}>
              Schedule
            </button>
            <button type="button" className="footer-link" onClick={() => onOpenApp('rooms')}>
              Rooms
            </button>
            <button type="button" className="footer-link" onClick={() => onOpenApp('events')}>
              Events
            </button>
            <button type="button" className="footer-link" onClick={() => onOpenApp('announcements')}>
              Announcements
            </button>
            <button type="button" className="footer-link" onClick={() => onOpenApp('assignments')}>
              Assignments
            </button>
            <button type="button" className="footer-link" onClick={() => onOpenApp('chat')}>
              AI Agent
            </button>
          </div>
          <div className="footer-copy">
            <span>AUST Academic Engine · Real-Time Campus Intelligence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
