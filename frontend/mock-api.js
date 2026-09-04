/**
 * CampusOS Standalone Verification Server (Optional dev tool)
 * Built with Node's native HTTP module (no extra npm dependencies needed).
 * Serves the exact contract on http://localhost:4000/api
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');

// Load seed datasets
function loadData(filename) {
  try {
    const raw = fs.readFileSync(path.join(dataDir, filename), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Mock API] Could not load ${filename}:`, err.message);
    return [];
  }
}

// In-memory data store for live testing
const db = {
  schedule: loadData('schedules.json'),
  rooms: loadData('rooms.json'),
  events: loadData('events.json'),
  announcements: loadData('announcements.json'),
  assignments: loadData('assignments.json'),
};

const PORT = 4000;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/^\/api/, '');

  let body = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString();
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      body = {};
    }
  }

  console.log(`[Mock API] ${req.method} /api${pathname}`);

  // 1. /schedule
  if (pathname === '/schedule' || pathname === '/schedules') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.schedule);
    }
    if (req.method === 'POST') {
      const newItem = { id: 'sch-' + Date.now(), ...body };
      db.schedule.unshift(newItem);
      return sendJson(res, 201, newItem);
    }
  }
  const scheduleMatch = pathname.match(/^\/schedule\/([^/]+)$/);
  if (scheduleMatch) {
    const id = scheduleMatch[1];
    if (req.method === 'PUT') {
      const idx = db.schedule.findIndex((s) => s.id === id);
      if (idx !== -1) {
        db.schedule[idx] = { ...db.schedule[idx], ...body };
        return sendJson(res, 200, db.schedule[idx]);
      }
      return sendJson(res, 404, { error: 'Schedule entry not found' });
    }
    if (req.method === 'DELETE') {
      db.schedule = db.schedule.filter((s) => s.id !== id);
      return sendJson(res, 200, { success: true });
    }
  }

  // 2. /rooms
  if (pathname === '/rooms') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.rooms);
    }
    if (req.method === 'POST') {
      const newItem = { id: 'room-' + Date.now(), bookings: [], ...body };
      db.rooms.unshift(newItem);
      return sendJson(res, 201, newItem);
    }
  }
  // Extra action: /rooms/:id/book
  const bookMatch = pathname.match(/^\/rooms\/([^/]+)\/book$/);
  if (bookMatch && req.method === 'POST') {
    const id = bookMatch[1];
    const room = db.rooms.find((r) => r.id === id);
    if (room) {
      if (!room.bookings) room.bookings = [];
      const newBooking = {
        booking_id: 'bk-' + Date.now(),
        id: 'bk-' + Date.now(),
        booked_by: body.bookedBy || body.booked_by || 'Student',
        bookedBy: body.bookedBy || body.booked_by || 'Student',
        date: body.date,
        start_time: body.startTime || body.start_time,
        startTime: body.startTime || body.start_time,
        end_time: body.endTime || body.end_time,
        endTime: body.endTime || body.end_time,
        purpose: body.purpose || 'Academic session',
      };
      room.bookings.push(newBooking);
      return sendJson(res, 200, { success: true, booking: newBooking });
    }
    return sendJson(res, 404, { error: 'Room not found' });
  }
  // Extra action: /rooms/:id/cancel-booking
  const cancelBookMatch = pathname.match(/^\/rooms\/([^/]+)\/cancel-booking$/);
  if (cancelBookMatch && req.method === 'POST') {
    const id = cancelBookMatch[1];
    const bId = body.bookingId || body.booking_id;
    const room = db.rooms.find((r) => r.id === id);
    if (room && room.bookings) {
      room.bookings = room.bookings.filter((b) => b.id !== bId && b.booking_id !== bId);
      return sendJson(res, 200, { success: true });
    }
    return sendJson(res, 404, { error: 'Room or booking not found' });
  }
  const roomMatch = pathname.match(/^\/rooms\/([^/]+)$/);
  if (roomMatch) {
    const id = roomMatch[1];
    if (req.method === 'PUT') {
      const idx = db.rooms.findIndex((r) => r.id === id);
      if (idx !== -1) {
        db.rooms[idx] = { ...db.rooms[idx], ...body };
        return sendJson(res, 200, db.rooms[idx]);
      }
      return sendJson(res, 404, { error: 'Room not found' });
    }
    if (req.method === 'DELETE') {
      db.rooms = db.rooms.filter((r) => r.id !== id);
      return sendJson(res, 200, { success: true });
    }
  }

  // 3. /events
  if (pathname === '/events') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.events);
    }
    if (req.method === 'POST') {
      const newItem = { id: 'evt-' + Date.now(), registered: 0, registrants: [], registrations: [], ...body };
      db.events.unshift(newItem);
      return sendJson(res, 201, newItem);
    }
  }
  // Extra action: /events/:id/register
  const registerMatch = pathname.match(/^\/events\/([^/]+)\/register$/);
  if (registerMatch && req.method === 'POST') {
    const id = registerMatch[1];
    const event = db.events.find((e) => e.id === id);
    if (event) {
      if (!event.registrants) event.registrants = [];
      event.registrants.push(body.name);
      event.registered = (event.registered || 0) + 1;
      return sendJson(res, 200, { success: true, event });
    }
    return sendJson(res, 404, { error: 'Event not found' });
  }
  // Extra action: /events/:id/cancel-registration
  const cancelRegMatch = pathname.match(/^\/events\/([^/]+)\/cancel-registration$/);
  if (cancelRegMatch && req.method === 'POST') {
    const id = cancelRegMatch[1];
    const event = db.events.find((e) => e.id === id);
    if (event && event.registrants) {
      event.registrants = event.registrants.filter((n) => n !== body.name);
      event.registered = Math.max(0, (event.registered || 1) - 1);
      return sendJson(res, 200, { success: true, event });
    }
    return sendJson(res, 404, { error: 'Event not found' });
  }
  const eventMatch = pathname.match(/^\/events\/([^/]+)$/);
  if (eventMatch) {
    const id = eventMatch[1];
    if (req.method === 'PUT') {
      const idx = db.events.findIndex((e) => e.id === id);
      if (idx !== -1) {
        db.events[idx] = { ...db.events[idx], ...body };
        return sendJson(res, 200, db.events[idx]);
      }
      return sendJson(res, 404, { error: 'Event not found' });
    }
    if (req.method === 'DELETE') {
      db.events = db.events.filter((e) => e.id !== id);
      return sendJson(res, 200, { success: true });
    }
  }

  // 4. /announcements
  if (pathname === '/announcements') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.announcements);
    }
    if (req.method === 'POST') {
      const newItem = { id: 'ann-' + Date.now(), ...body };
      db.announcements.unshift(newItem);
      return sendJson(res, 201, newItem);
    }
  }
  const annMatch = pathname.match(/^\/announcements\/([^/]+)$/);
  if (annMatch) {
    const id = annMatch[1];
    if (req.method === 'PUT') {
      const idx = db.announcements.findIndex((a) => a.id === id);
      if (idx !== -1) {
        db.announcements[idx] = { ...db.announcements[idx], ...body };
        return sendJson(res, 200, db.announcements[idx]);
      }
      return sendJson(res, 404, { error: 'Announcement not found' });
    }
    if (req.method === 'DELETE') {
      db.announcements = db.announcements.filter((a) => a.id !== id);
      return sendJson(res, 200, { success: true });
    }
  }

  // 5. /assignments
  if (pathname === '/assignments') {
    if (req.method === 'GET') {
      return sendJson(res, 200, db.assignments);
    }
    if (req.method === 'POST') {
      const newItem = { id: 'asgn-' + Date.now(), ...body };
      db.assignments.unshift(newItem);
      return sendJson(res, 201, newItem);
    }
  }
  const asgnMatch = pathname.match(/^\/assignments\/([^/]+)$/);
  if (asgnMatch) {
    const id = asgnMatch[1];
    if (req.method === 'PUT') {
      const idx = db.assignments.findIndex((a) => a.id === id);
      if (idx !== -1) {
        db.assignments[idx] = { ...db.assignments[idx], ...body };
        return sendJson(res, 200, db.assignments[idx]);
      }
      return sendJson(res, 404, { error: 'Assignment not found' });
    }
    if (req.method === 'DELETE') {
      db.assignments = db.assignments.filter((a) => a.id !== id);
      return sendJson(res, 200, { success: true });
    }
  }

  // 6. /agent/chat
  if (pathname === '/agent/chat' && req.method === 'POST') {
    const msg = (body.message || '').toLowerCase();

    // Simulated intelligent response with tool calls based on message intent
    if (msg.includes('book') && msg.includes('7a02')) {
      const room = db.rooms.find((r) => r.room_number === '7A02' || r.roomNumber === '7A02') || db.rooms[1];
      if (room) {
        if (!room.bookings) room.bookings = [];
        room.bookings.push({
          booking_id: 'bk-' + Date.now(),
          booked_by: 'Farhan',
          date: '2026-09-05',
          start_time: '15:00',
          end_time: '17:00',
          purpose: 'Study session',
        });
      }
      return sendJson(res, 200, {
        reply: "I have checked Room 7A02's availability and reserved it for tomorrow between 3:00 PM and 5:00 PM under Farhan.",
        toolCalls: [
          {
            name: 'book_room',
            args: { roomNumber: '7A02', date: '2026-09-05', startTime: '15:00', endTime: '17:00', bookedBy: 'Farhan' },
            result: { success: true },
          },
        ],
      });
    }

    if (msg.includes('register') && (msg.includes('hackathon') || msg.includes('farhan') || msg.includes('ai'))) {
      const event = db.events[0];
      if (event) {
        if (!event.registrants) event.registrants = [];
        event.registrants.push('Farhan Ahmed');
        event.registered = (event.registered || 0) + 1;
      }
      return sendJson(res, 200, {
        reply: `You're all set! I have added Farhan Ahmed to the attendee roster for "${event?.name || 'AUSTPIC AI Build Hackathon'}".`,
        toolCalls: [
          {
            name: 'register_event',
            args: { eventId: event?.id, eventName: event?.name, name: 'Farhan Ahmed' },
            result: { success: true },
          },
        ],
      });
    }

    if (msg.includes('next class')) {
      return sendJson(res, 200, {
        reply: "Your next scheduled class is CSE 4113 (Pattern Recognition and Machine Learning) on Sunday at 13:00 in Room 7A07 with Prof. Dr. Md. Shahriar Mahbub.",
        toolCalls: [
          {
            name: 'query_schedule',
            args: { course: 'CSE 4113', day: 'Sunday' },
            result: { found: 1 },
          },
        ],
      });
    }

    if (msg.includes('due this week') || msg.includes('deadline')) {
      return sendJson(res, 200, {
        reply: "You have 2 items due this week: CSE 4114 Lab Report 1 (due 2026-09-07) and CSE 4173 Cryptography Assignment 1 (due 2026-09-09).",
        toolCalls: [
          {
            name: 'query_assignments',
            args: { status: 'pending' },
            result: { count: 2 },
          },
        ],
      });
    }

    // Default friendly assistant response
    return sendJson(res, 200, {
      reply: `I looked into the campus records for your query "${body.message}". Everything is up-to-date across all 5 campus systems. Let me know if you need to book a room, register for an event, or inspect schedules.`,
      toolCalls: [],
    });
  }

  // 404 Not Found
  return sendJson(res, 404, { error: `Endpoint ${req.method} /api${pathname} not found on CampusOS API.` });
});

server.listen(PORT, () => {
  console.log(`[CampusOS Mock API] Server listening on http://localhost:${PORT}/api`);
  console.log(`[CampusOS Mock API] Loaded ${db.schedule.length} schedules, ${db.rooms.length} rooms, ${db.events.length} events, ${db.announcements.length} notices, ${db.assignments.length} assignments.`);
});
