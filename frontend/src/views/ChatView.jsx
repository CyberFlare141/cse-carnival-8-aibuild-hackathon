import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { useData } from '../context/DataContext';

/**
 * Parses and formats toolCalls into compact human-readable badges
 */
function formatToolCallSummary(call) {
  if (!call) return 'Executed unknown tool action';
  const name = call.name || call.tool || 'tool_action';
  const args = call.args || call.arguments || {};

  // Room booking
  if (name.includes('book') && !name.includes('cancel')) {
    const room = args.roomNumber || args.room_number || args.roomId || args.id || 'Room';
    const date = args.date || '';
    const time =
      (args.startTime && args.endTime ? `${args.startTime}–${args.endTime}` : '') ||
      (args.start_time && args.end_time ? `${args.start_time}–${args.end_time}` : '') ||
      args.time ||
      '';
    const by = args.bookedBy || args.booked_by ? ` for ${args.bookedBy || args.booked_by}` : '';
    return `Booked Room ${room}${date ? `, ${date}` : ''}${time ? ` (${time})` : ''}${by}`;
  }

  // Cancel booking
  if (name.includes('cancel') && name.includes('book')) {
    const room = args.roomNumber || args.roomId || args.room_number ? ` Room ${args.roomNumber || args.roomId}` : '';
    return `Cancelled room reservation${room}`;
  }

  // Event registration
  if (name.includes('register') && !name.includes('cancel')) {
    const person = args.name || args.student_id || 'Student';
    const event = args.eventName || args.event_name || args.eventId ? ` for ${args.eventName || args.event_name || args.eventId}` : '';
    return `Registered ${person}${event}`;
  }

  // Cancel registration
  if (name.includes('cancel') && name.includes('reg')) {
    const person = args.name || 'Student';
    return `Cancelled registration for ${person}`;
  }

  // Announcement
  if (name.includes('announcement')) {
    if (name.includes('create') || name.includes('add') || name.includes('post')) {
      return `Pinned announcement: "${args.title || 'New notice'}"`;
    }
    if (name.includes('update') || name.includes('edit')) {
      return `Updated announcement: "${args.title || args.id || 'Notice'}"`;
    }
    if (name.includes('delete') || name.includes('remove')) {
      return `Removed announcement from notice board`;
    }
  }

  // Schedule
  if (name.includes('schedule') || name.includes('class')) {
    if (name.includes('create') || name.includes('add')) {
      return `Scheduled class ${args.course || ''} on ${args.day || ''} in ${args.room || ''}`;
    }
    if (name.includes('update') || name.includes('edit')) {
      return `Updated class schedule for ${args.course || args.id || ''}`;
    }
    if (name.includes('delete') || name.includes('cancel')) {
      return `Cancelled class session`;
    }
  }

  // Assignment
  if (name.includes('assignment')) {
    return `Updated coursework records for ${args.course || args.title || 'course'}`;
  }

  // Fallback cleaner format
  const readableName = name.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase();
  const keys = Object.keys(args)
    .filter((k) => typeof args[k] !== 'object')
    .slice(0, 3)
    .map((k) => `${k}: ${args[k]}`)
    .join(', ');

  return `Action: ${readableName}${keys ? ` (${keys})` : ''}`;
}

export function ChatView() {
  const { notifyAgentMutation } = useData();

  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      role: 'agent',
      content:
        "⚡ Welcome to CampusOS Intelligence! I am your autonomous campus agent wired directly into live timetables, room availability, events, notices, and coursework.\n\nAsk me anything or tell me to book a room or register for an event!",
      toolCalls: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const samplePrompts = [
    'When is my next class?',
    'What have I got due this week?',
    'Is Room 7A03 free tomorrow?',
    'Book Room 7A02 tomorrow 3 to 5 PM for Farhan',
    'Register Farhan Ahmed for the AI Build Hackathon',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isSending) return;

    setErrorBanner('');
    const userMsgId = 'msg-' + Date.now();
    const newUserMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update conversation history
    const updatedHistory = [...messages, newUserMessage];
    setMessages(updatedHistory);
    setInputValue('');
    setIsSending(true);

    try {
      // Build conversation history payload (excluding initial greeting to keep context clean)
      const historyPayload = updatedHistory
        .filter((m) => m.id !== 'welcome-msg')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await api.sendChatMessage(text, historyPayload);

      const agentMsgId = 'agent-' + Date.now();
      const newAgentMessage = {
        id: agentMsgId,
        role: 'agent',
        content: response.reply,
        toolCalls: response.toolCalls || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, newAgentMessage]);

      // If the agent performed tool actions that modify state, refresh dashboard
      if (response.toolCalls && response.toolCalls.length > 0) {
        notifyAgentMutation(response.toolCalls);
      }
    } catch (err) {
      console.error('[CampusOS Chat] Error:', err);
      const errorMessage = err.isNetworkError
        ? 'Could not reach CampusOS backend.'
        : err.message || 'CampusOS Agent request failed.';
      setErrorBanner(errorMessage);
      // Append a helpful error message in the chat
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'agent',
          content: errorMessage,
          toolCalls: [],
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="board-workspace" style={{ paddingBottom: '20px' }}>
      <div className="chat-container">
        <div className="chat-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent-yellow)', fontWeight: 900, fontSize: '15px' }}>
              ✦ AUTONOMOUS AI AGENT
            </span>
            <span>·</span>
            <span style={{ color: 'var(--text-muted)' }}>Reads & executes live actions with function calling</span>
          </div>
          <span
            className="code-badge"
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderColor: 'var(--accent-purple)',
              color: 'var(--accent-purple)',
            }}
          >
            POST /api/chat
          </span>
        </div>

        {errorBanner && (
          <div
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(255, 107, 53, 0.2)',
              borderBottom: '3px solid var(--accent-orange)',
              color: 'var(--accent-orange)',
              fontSize: '13.5px',
              fontWeight: 700,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>⚠️ {errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 900 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages Feed */}
        <div className="chat-messages-area">
          {messages.map((msg) => {
            const isAgent = msg.role === 'agent';
            const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;

            return (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                <div className="message-meta">
                  {isAgent ? (
                    <>
                      <span style={{ color: 'var(--accent-yellow)', fontWeight: 900 }}>⚡ CampusOS Agent</span>
                      <span>·</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{msg.timestamp}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{msg.timestamp}</span>
                      <span>·</span>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 800 }}>Student</span>
                    </>
                  )}
                </div>

                {/* COMPACT TOOL CALL TRACE */}
                {isAgent && hasToolCalls && (
                  <div className="tool-call-trace">
                    <div className="tool-trace-title">
                      <span>✦ EXECUTION TRACE: LIVE ACTION EXECUTED</span>
                    </div>
                    {msg.toolCalls.map((call, idx) => (
                      <div key={idx} className="tool-trace-item">
                        <span style={{ color: 'var(--accent-cyan)' }}>✓</span>
                        <span>{formatToolCallSummary(call)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="message-bubble"
                  style={
                    msg.isError
                      ? { borderColor: 'var(--accent-orange)', backgroundColor: 'rgba(255, 107, 53, 0.15)' }
                      : {}
                  }
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="chat-message agent">
              <div className="message-meta">
                <span style={{ color: 'var(--accent-yellow)', fontWeight: 900 }}>⚡ CampusOS Agent</span>
                <span>·</span>
                <span style={{ color: 'var(--accent-cyan)', fontSize: '11px' }}>Consulting registries...</span>
              </div>
              <div
                className="message-bubble"
                style={{
                  fontStyle: 'italic',
                  color: 'var(--text-muted)',
                  borderStyle: 'dashed',
                  animation: 'pulseDot 1.5s infinite',
                }}
              >
                ✨ Analyzing campus data and executing tools...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Sample Queries */}
        <div className="chat-suggestions">
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-yellow)', alignSelf: 'center', marginRight: '4px' }}>
            ⚡ QUICK QUERIES:
          </span>
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="suggestion-chip"
              onClick={() => handleSendMessage(prompt)}
              disabled={isSending}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="chat-input-bar">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Ask CampusOS (e.g. 'When is my next class?' or 'Book Room 7A02 tomorrow 3 to 5 PM')..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isSending}
          >
            {isSending ? 'Thinking...' : '⚡ Send Query'}
          </button>
        </div>
      </div>
    </div>
  );
}
