/**
 * CampusOS API Client
 * Configurable base URL with resilient payload/response normalizers
 */

// Keep the server location in one place. VITE_API_URL can override this for
// deployment, while the default matches the FastAPI run command in the repo.
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

function readErrorMessage(data, fallback) {
  const detail = data?.error || data?.message || data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || String(item)).join('; ');
  }
  return detail || fallback;
}

/**
 * Standard fetch helper with JSON parsing and structured error handling
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const errorMsg = readErrorMessage(data, `HTTP Error ${response.status}: ${response.statusText}`);
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      console.warn(`[CampusOS API] Network error connecting to ${url}`);
      const netErr = new Error(
        `Unable to reach the CampusOS FastAPI backend at ${BASE_URL}. Ensure it is running.`
      );
      netErr.isNetworkError = true;
      throw netErr;
    }
    throw err;
  }
}

// -----------------------------------------------------------------------------
// NORMALIZERS
// -----------------------------------------------------------------------------

export function normalizeSchedule(item) {
  if (!item) return null;
  const time =
    item.time ||
    (item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : item.start_time || '');
  return {
    id: item.id || item._id,
    course: item.course || '',
    title: item.title || '',
    day: item.day || 'Sunday',
    time,
    start_time: item.start_time || '',
    end_time: item.end_time || '',
    room: item.room || '',
    instructor: item.instructor || 'TBA',
    section: item.section || '',
  };
}

export function normalizeRoom(item) {
  if (!item) return null;
  const bookings = Array.isArray(item.bookings)
    ? item.bookings.map((b, idx) => ({
        id: b.id || b.booking_id || `bk-${idx}`,
        booking_id: b.booking_id || b.id || `bk-${idx}`,
        date: b.date || '',
        startTime: b.startTime || b.start_time || '',
        start_time: b.start_time || b.startTime || '',
        endTime: b.endTime || b.end_time || '',
        end_time: b.end_time || b.endTime || '',
        bookedBy: b.bookedBy || b.booked_by || 'Unknown',
        booked_by: b.booked_by || b.bookedBy || 'Unknown',
        purpose: b.purpose || '',
      }))
    : [];

  return {
    id: item.id || item._id,
    roomNumber: item.roomNumber || item.room_number || item.room || '',
    room_number: item.room_number || item.roomNumber || item.room || '',
    type: item.type || 'classroom',
    capacity: Number(item.capacity) || 0,
    equipment: Array.isArray(item.equipment) ? item.equipment : [],
    floor: item.floor != null ? item.floor : 7,
    status: item.status || 'available',
    bookings,
  };
}

export function normalizeEvent(item) {
  if (!item) return null;
  const rawRegistrants = item.registrants || item.registrations || [];
  const registrants = Array.isArray(rawRegistrants)
    ? rawRegistrants.map((r) => {
        if (typeof r === 'string') return r;
        if (r && typeof r === 'object') return r.name || r.student_id || 'Student';
        return String(r);
      })
    : [];

  const time =
    item.time ||
    (item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : item.start_time || '');

  return {
    id: item.id || item._id,
    name: item.name || '',
    description: item.description || '',
    date: item.date || '',
    time,
    start_time: item.start_time || '',
    end_time: item.end_time || '',
    venue: item.venue || item.room || '',
    organizer: item.organizer || '',
    capacity: Number(item.capacity) || 0,
    registered: item.registered != null ? Number(item.registered) : registrants.length,
    registrants,
    status: item.status || 'upcoming',
  };
}

export function normalizeAnnouncement(item) {
  if (!item) return null;
  return {
    id: item.id || item._id,
    title: item.title || '',
    body: item.body || '',
    date: item.date || new Date().toISOString().split('T')[0],
    priority: (item.priority || 'medium').toLowerCase(),
    posted_by: item.posted_by || item.postedBy || 'Campus Administration',
    expires: item.expires || '',
  };
}

export function normalizeAssignment(item) {
  if (!item) return null;
  return {
    id: item.id || item._id,
    course: item.course || '',
    course_title: item.course_title || item.courseTitle || '',
    title: item.title || '',
    description: item.description || '',
    deadline: item.deadline || '',
    status: (item.status || 'pending').toLowerCase(),
    submission_platform: item.submission_platform || item.submissionPlatform || 'Campus Portal',
    marks: item.marks != null ? Number(item.marks) : 100,
  };
}

// -----------------------------------------------------------------------------
// API CLIENT METHODS
// -----------------------------------------------------------------------------

export const api = {
  getBaseUrl() {
    return BASE_URL;
  },

  // --- Health / Ping check ---
  async checkHealth() {
    try {
      const res = await fetch(`${BASE_URL}/schedules`, { method: 'GET', signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // --- 1. Schedule ---
  async getSchedule() {
    const data = await request('/schedules');
    const list = Array.isArray(data) ? data : data.schedule || [];
    return list.map(normalizeSchedule);
  },

  async createSchedule(payload) {
    const body = {
      course: payload.course,
      title: payload.title || '',
      day: payload.day,
      time: payload.time,
      room: payload.room,
      instructor: payload.instructor,
      section: payload.section || '',
      start_time: payload.start_time || payload.time?.split('-')[0]?.trim() || '',
      end_time: payload.end_time || payload.time?.split('-')[1]?.trim() || '',
    };
    const res = await request('/schedules', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return normalizeSchedule(res);
  },

  async updateSchedule(id, payload) {
    const body = {
      course: payload.course,
      title: payload.title,
      day: payload.day,
      time: payload.time,
      room: payload.room,
      instructor: payload.instructor,
      section: payload.section,
      start_time: payload.start_time,
      end_time: payload.end_time,
    };
    const res = await request(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return normalizeSchedule(res);
  },

  async deleteSchedule(id) {
    return await request(`/schedules/${id}`, { method: 'DELETE' });
  },

  // --- 2. Rooms ---
  async getRooms() {
    const data = await request('/rooms');
    const list = Array.isArray(data) ? data : data.rooms || [];
    return list.map(normalizeRoom);
  },

  async createRoom(payload) {
    const body = {
      roomNumber: payload.roomNumber,
      room_number: payload.roomNumber,
      capacity: Number(payload.capacity),
      equipment: Array.isArray(payload.equipment) ? payload.equipment : [],
      floor: payload.floor != null ? Number(payload.floor) : 7,
      type: payload.type || 'classroom',
      status: payload.status || 'available',
      bookings: [],
    };
    const res = await request('/rooms', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return normalizeRoom(res);
  },

  async updateRoom(id, payload) {
    const body = {
      roomNumber: payload.roomNumber,
      room_number: payload.roomNumber,
      capacity: Number(payload.capacity),
      equipment: Array.isArray(payload.equipment) ? payload.equipment : [],
      floor: payload.floor != null ? Number(payload.floor) : 7,
      type: payload.type,
      status: payload.status,
    };
    const res = await request(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return normalizeRoom(res);
  },

  async deleteRoom(id) {
    return await request(`/rooms/${id}`, { method: 'DELETE' });
  },

  async bookRoom(roomId, { date, startTime, endTime, bookedBy, purpose }) {
    const body = {
      date,
      startTime,
      endTime,
      bookedBy,
      // snake_case dual compatibility
      start_time: startTime,
      end_time: endTime,
      booked_by: bookedBy,
      purpose: purpose || 'Academic session',
    };
    const res = await request(`/rooms/${roomId}/book`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res;
  },

  async cancelBooking(roomId, bookingId) {
    const body = {
      bookingId,
      booking_id: bookingId,
    };
    const res = await request(`/rooms/${roomId}/cancel-booking`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res;
  },

  // --- 3. Events ---
  async getEvents() {
    const data = await request('/events');
    const list = Array.isArray(data) ? data : data.events || [];
    return list.map(normalizeEvent);
  },

  async createEvent(payload) {
    const body = {
      name: payload.name,
      description: payload.description || '',
      date: payload.date,
      time: payload.time,
      start_time: payload.start_time || payload.time?.split('-')[0]?.trim() || '',
      end_time: payload.end_time || payload.time?.split('-')[1]?.trim() || '',
      venue: payload.venue || '',
      organizer: payload.organizer || '',
      capacity: Number(payload.capacity),
      registered: 0,
      registrants: [],
      registrations: [],
      status: payload.status || 'upcoming',
    };
    const res = await request('/events', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return normalizeEvent(res);
  },

  async updateEvent(id, payload) {
    const body = {
      name: payload.name,
      description: payload.description,
      date: payload.date,
      time: payload.time,
      venue: payload.venue,
      organizer: payload.organizer,
      capacity: Number(payload.capacity),
      status: payload.status,
    };
    const res = await request(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return normalizeEvent(res);
  },

  async deleteEvent(id) {
    return await request(`/events/${id}`, { method: 'DELETE' });
  },

  async registerEvent(eventId, name) {
    const body = { name };
    const res = await request(`/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res;
  },

  async cancelEventRegistration(eventId, name) {
    const body = { name };
    const res = await request(`/events/${eventId}/cancel-registration`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res;
  },

  // --- 4. Announcements ---
  async getAnnouncements() {
    const data = await request('/announcements');
    const list = Array.isArray(data) ? data : data.announcements || [];
    return list.map(normalizeAnnouncement);
  },

  async createAnnouncement(payload) {
    const body = {
      title: payload.title,
      body: payload.body,
      date: payload.date || new Date().toISOString().split('T')[0],
      priority: payload.priority || 'medium',
      posted_by: payload.posted_by || 'Faculty Dean',
      expires: payload.expires || '',
    };
    const res = await request('/announcements', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return normalizeAnnouncement(res);
  },

  async updateAnnouncement(id, payload) {
    const body = {
      title: payload.title,
      body: payload.body,
      date: payload.date,
      priority: payload.priority,
      posted_by: payload.posted_by,
      expires: payload.expires,
    };
    const res = await request(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return normalizeAnnouncement(res);
  },

  async deleteAnnouncement(id) {
    return await request(`/announcements/${id}`, { method: 'DELETE' });
  },

  // --- 5. Assignments ---
  async getAssignments() {
    const data = await request('/assignments');
    const list = Array.isArray(data) ? data : data.assignments || [];
    return list.map(normalizeAssignment);
  },

  async createAssignment(payload) {
    const body = {
      course: payload.course,
      course_title: payload.course_title || '',
      title: payload.title,
      description: payload.description || '',
      deadline: payload.deadline,
      status: payload.status || 'pending',
      submission_platform: payload.submission_platform || 'Campus Portal',
      marks: payload.marks != null ? Number(payload.marks) : 100,
    };
    const res = await request('/assignments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return normalizeAssignment(res);
  },

  async updateAssignment(id, payload) {
    const body = {
      course: payload.course,
      course_title: payload.course_title,
      title: payload.title,
      description: payload.description,
      deadline: payload.deadline,
      status: payload.status,
      submission_platform: payload.submission_platform,
      marks: payload.marks != null ? Number(payload.marks) : undefined,
    };
    const res = await request(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return normalizeAssignment(res);
  },

  async deleteAssignment(id) {
    return await request(`/assignments/${id}`, { method: 'DELETE' });
  },

  // --- 6. Agent Chat ---
  async sendChatMessage(message, history = []) {
    const body = {
      message,
      conversation_history: history.map((msg) => ({
        role: msg.role === 'agent' ? 'assistant' : msg.role,
        content: msg.content || msg.text || '',
      })),
    };
    const res = await request('/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Contract: { reply, toolCalls: [{name, args, result}] }
    return {
      reply: res.reply || res.message || res.text || 'No response returned from agent.',
      toolCalls: Array.isArray(res.toolCalls)
        ? res.toolCalls
        : Array.isArray(res.tool_calls)
        ? res.tool_calls
        : Array.isArray(res.tools_called)
        ? res.tools_called
        : [],
    };
  },
};
