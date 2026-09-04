import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // Datasets
  const [schedule, setSchedule] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Loading states
  const [loading, setLoading] = useState({
    schedule: true,
    rooms: true,
    events: true,
    announcements: true,
    assignments: true,
  });

  // Error states
  const [errors, setErrors] = useState({
    schedule: null,
    rooms: null,
    events: null,
    announcements: null,
    assignments: null,
  });

  // Connection & Backend health
  const [isBackendOnline, setIsBackendOnline] = useState(null); // null = unknown, true = online, false = offline
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // --- Fetch individual section ---
  const fetchSection = useCallback(
    async (section) => {
      setLoading((prev) => ({ ...prev, [section]: true }));
      setErrors((prev) => ({ ...prev, [section]: null }));

      try {
        let result;
        switch (section) {
          case 'schedule':
            result = await api.getSchedule();
            setSchedule(result);
            break;
          case 'rooms':
            result = await api.getRooms();
            setRooms(result);
            break;
          case 'events':
            result = await api.getEvents();
            setEvents(result);
            break;
          case 'announcements':
            result = await api.getAnnouncements();
            setAnnouncements(result);
            break;
          case 'assignments':
            result = await api.getAssignments();
            setAssignments(result);
            break;
          default:
            break;
        }
        setIsBackendOnline(true);
      } catch (err) {
        console.error(`[CampusOS] Error fetching ${section}:`, err);
        setErrors((prev) => ({ ...prev, [section]: err.message }));
        if (err.isNetworkError) {
          setIsBackendOnline(false);
        }
      } finally {
        setLoading((prev) => ({ ...prev, [section]: false }));
      }
    },
    []
  );

  // --- Fetch all sections ---
  const fetchAll = useCallback(async () => {
    setLoading({
      schedule: true,
      rooms: true,
      events: true,
      announcements: true,
      assignments: true,
    });

    const results = await Promise.allSettled([
      api.getSchedule(),
      api.getRooms(),
      api.getEvents(),
      api.getAnnouncements(),
      api.getAssignments(),
    ]);

    const [schRes, roomsRes, evtsRes, annRes, asgnRes] = results;

    let hasAnySuccess = false;
    let hasNetworkError = false;

    if (schRes.status === 'fulfilled') {
      setSchedule(schRes.value);
      setErrors((prev) => ({ ...prev, schedule: null }));
      hasAnySuccess = true;
    } else {
      setErrors((prev) => ({ ...prev, schedule: schRes.reason?.message }));
      if (schRes.reason?.isNetworkError) hasNetworkError = true;
    }

    if (roomsRes.status === 'fulfilled') {
      setRooms(roomsRes.value);
      setErrors((prev) => ({ ...prev, rooms: null }));
      hasAnySuccess = true;
    } else {
      setErrors((prev) => ({ ...prev, rooms: roomsRes.reason?.message }));
      if (roomsRes.reason?.isNetworkError) hasNetworkError = true;
    }

    if (evtsRes.status === 'fulfilled') {
      setEvents(evtsRes.value);
      setErrors((prev) => ({ ...prev, events: null }));
      hasAnySuccess = true;
    } else {
      setErrors((prev) => ({ ...prev, events: evtsRes.reason?.message }));
      if (evtsRes.reason?.isNetworkError) hasNetworkError = true;
    }

    if (annRes.status === 'fulfilled') {
      setAnnouncements(annRes.value);
      setErrors((prev) => ({ ...prev, announcements: null }));
      hasAnySuccess = true;
    } else {
      setErrors((prev) => ({ ...prev, announcements: annRes.reason?.message }));
      if (annRes.reason?.isNetworkError) hasNetworkError = true;
    }

    if (asgnRes.status === 'fulfilled') {
      setAssignments(asgnRes.value);
      setErrors((prev) => ({ ...prev, assignments: null }));
      hasAnySuccess = true;
    } else {
      setErrors((prev) => ({ ...prev, assignments: asgnRes.reason?.message }));
      if (asgnRes.reason?.isNetworkError) hasNetworkError = true;
    }

    setLoading({
      schedule: false,
      rooms: false,
      events: false,
      announcements: false,
      assignments: false,
    });

    if (hasAnySuccess) {
      setIsBackendOnline(true);
    } else if (hasNetworkError) {
      setIsBackendOnline(false);
    }

    setLastRefreshedAt(new Date());
  }, []);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Periodic heartbeat / sync (every 25s) to stay fresh if backend is modified externally
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAll();
    }, 25000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  // --- CRUD Actions with optimistic or immediate updates ---

  // 1. Add Record
  const handleAddRecord = async (section, payload) => {
    try {
      let created;
      switch (section) {
        case 'schedule':
          created = await api.createSchedule(payload);
          setSchedule((prev) => [created, ...prev]);
          addToast(`Class ${created.course} added to schedule`, 'success');
          break;
        case 'rooms':
          created = await api.createRoom(payload);
          setRooms((prev) => [created, ...prev]);
          addToast(`Room ${created.roomNumber} added to registry`, 'success');
          break;
        case 'events':
          created = await api.createEvent(payload);
          setEvents((prev) => [created, ...prev]);
          addToast(`Event "${created.name}" posted to board`, 'success');
          break;
        case 'announcements':
          created = await api.createAnnouncement(payload);
          setAnnouncements((prev) => [created, ...prev]);
          addToast(`Notice "${created.title}" pinned to board`, 'success');
          break;
        case 'assignments':
          created = await api.createAssignment(payload);
          setAssignments((prev) => [created, ...prev]);
          addToast(`Assignment "${created.title}" recorded`, 'success');
          break;
        default:
          break;
      }
      // Re-fetch to ensure backend canonical state
      fetchSection(section);
      return { success: true, item: created };
    } catch (err) {
      addToast(`Failed to add record: ${err.message}`, 'error');
      throw err;
    }
  };

  // 2. Edit Record
  const handleEditRecord = async (section, id, payload) => {
    try {
      let updated;
      switch (section) {
        case 'schedule':
          updated = await api.updateSchedule(id, payload);
          setSchedule((prev) => prev.map((item) => (item.id === id ? updated : item)));
          addToast(`Schedule entry for ${updated.course} updated`, 'success');
          break;
        case 'rooms':
          updated = await api.updateRoom(id, payload);
          setRooms((prev) => prev.map((item) => (item.id === id ? updated : item)));
          addToast(`Room ${updated.roomNumber} updated`, 'success');
          break;
        case 'events':
          updated = await api.updateEvent(id, payload);
          setEvents((prev) => prev.map((item) => (item.id === id ? updated : item)));
          addToast(`Event "${updated.name}" updated`, 'success');
          break;
        case 'announcements':
          updated = await api.updateAnnouncement(id, payload);
          setAnnouncements((prev) => prev.map((item) => (item.id === id ? updated : item)));
          addToast(`Announcement updated`, 'success');
          break;
        case 'assignments':
          updated = await api.updateAssignment(id, payload);
          setAssignments((prev) => prev.map((item) => (item.id === id ? updated : item)));
          addToast(`Assignment updated`, 'success');
          break;
        default:
          break;
      }
      fetchSection(section);
      return { success: true, item: updated };
    } catch (err) {
      addToast(`Failed to update record: ${err.message}`, 'error');
      throw err;
    }
  };

  // 3. Delete Record
  const handleDeleteRecord = async (section, id) => {
    // Optimistic remove
    const prevItems = {
      schedule,
      rooms,
      events,
      announcements,
      assignments,
    }[section];

    switch (section) {
      case 'schedule':
        setSchedule((prev) => prev.filter((i) => i.id !== id));
        break;
      case 'rooms':
        setRooms((prev) => prev.filter((i) => i.id !== id));
        break;
      case 'events':
        setEvents((prev) => prev.filter((i) => i.id !== id));
        break;
      case 'announcements':
        setAnnouncements((prev) => prev.filter((i) => i.id !== id));
        break;
      case 'assignments':
        setAssignments((prev) => prev.filter((i) => i.id !== id));
        break;
      default:
        break;
    }

    try {
      switch (section) {
        case 'schedule':
          await api.deleteSchedule(id);
          break;
        case 'rooms':
          await api.deleteRoom(id);
          break;
        case 'events':
          await api.deleteEvent(id);
          break;
        case 'announcements':
          await api.deleteAnnouncement(id);
          break;
        case 'assignments':
          await api.deleteAssignment(id);
          break;
        default:
          break;
      }
      addToast(`Record removed from ${section}`, 'info');
      fetchSection(section);
      return { success: true };
    } catch (err) {
      // Rollback on error
      if (section === 'schedule') setSchedule(prevItems);
      if (section === 'rooms') setRooms(prevItems);
      if (section === 'events') setEvents(prevItems);
      if (section === 'announcements') setAnnouncements(prevItems);
      if (section === 'assignments') setAssignments(prevItems);
      addToast(`Delete failed: ${err.message}`, 'error');
      throw err;
    }
  };

  // 4. Room Booking Action
  const handleBookRoom = async (roomId, bookingData) => {
    try {
      await api.bookRoom(roomId, bookingData);
      addToast(`Booking confirmed for ${bookingData.bookedBy}`, 'success');
      await fetchSection('rooms');
      return { success: true };
    } catch (err) {
      addToast(`Booking failed: ${err.message}`, 'error');
      throw err;
    }
  };

  // 5. Cancel Room Booking Action
  const handleCancelBooking = async (roomId, bookingId) => {
    try {
      await api.cancelBooking(roomId, bookingId);
      addToast(`Booking removed from room ledger`, 'info');
      await fetchSection('rooms');
      return { success: true };
    } catch (err) {
      addToast(`Cancellation failed: ${err.message}`, 'error');
      throw err;
    }
  };

  // 6. Event Registration Action
  const handleRegisterEvent = async (eventId, studentName) => {
    try {
      await api.registerEvent(eventId, studentName);
      addToast(`Registered ${studentName} for event`, 'success');
      await fetchSection('events');
      return { success: true };
    } catch (err) {
      addToast(`Registration failed: ${err.message}`, 'error');
      throw err;
    }
  };

  // 7. Cancel Event Registration Action
  const handleCancelRegistration = async (eventId, studentName) => {
    try {
      await api.cancelEventRegistration(eventId, studentName);
      addToast(`Cancelled registration for ${studentName}`, 'info');
      await fetchSection('events');
      return { success: true };
    } catch (err) {
      addToast(`Cancellation failed: ${err.message}`, 'error');
      throw err;
    }
  };

  // 8. Triggered after Agent Chat with Tool Calls
  const handleAgentMutationRefresh = useCallback(
    (toolCalls = []) => {
      console.log('[CampusOS] Agent completed tool actions:', toolCalls);
      // If the agent performed any tool calls, refresh all sections to guarantee zero stale data
      fetchAll();
    },
    [fetchAll]
  );

  const value = {
    schedule,
    rooms,
    events,
    announcements,
    assignments,
    loading,
    errors,
    isBackendOnline,
    lastRefreshedAt,
    toasts,
    addToast,
    removeToast,
    fetchSection,
    fetchAll,
    addRecord: handleAddRecord,
    editRecord: handleEditRecord,
    deleteRecord: handleDeleteRecord,
    bookRoom: handleBookRoom,
    cancelBooking: handleCancelBooking,
    registerEvent: handleRegisterEvent,
    cancelRegistration: handleCancelRegistration,
    notifyAgentMutation: handleAgentMutationRefresh,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
