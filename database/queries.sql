-- ============================================================================
-- CampusOS Query Library & Operational SQL Patterns
-- Database: Microsoft SQL Server
-- Target: CampusOS
-- Reference: sample_queries/sample_queries.md & Step 10 Operations
-- ============================================================================

USE CampusOS;
GO

-- ============================================================================
-- 1. SCHEDULES OPERATIONS
-- ============================================================================

-- 1.1 List all schedules ordered by day and start time
SELECT id, course, title, day, CONVERT(VARCHAR(5), start_time, 108) AS start_time, CONVERT(VARCHAR(5), end_time, 108) AS end_time, room, instructor, section
FROM dbo.Schedules
ORDER BY 
    CASE day 
        WHEN 'Sunday' THEN 1 
        WHEN 'Monday' THEN 2 
        WHEN 'Tuesday' THEN 3 
        WHEN 'Wednesday' THEN 4 
        WHEN 'Thursday' THEN 5 
    END, 
    start_time ASC;

-- 1.2 Find schedules for a specific day (e.g., 'Wednesday')
-- Sample query: "What classes do I have on Wednesday?"
SELECT id, course, title, CONVERT(VARCHAR(5), start_time, 108) AS start_time, CONVERT(VARCHAR(5), end_time, 108) AS end_time, room, instructor, section
FROM dbo.Schedules
WHERE day = 'Wednesday'
ORDER BY start_time ASC;

-- 1.3 Find a specific course/class by course code or title
SELECT id, course, title, day, CONVERT(VARCHAR(5), start_time, 108) AS start_time, CONVERT(VARCHAR(5), end_time, 108) AS end_time, room, instructor, section
FROM dbo.Schedules
WHERE course = 'CSE 4113' OR title LIKE '%Pattern Recognition%'
ORDER BY day, start_time;

-- 1.4 Find next upcoming class given current day and current time
-- Sample query: "When is my next class?"
DECLARE @CurrentDay VARCHAR(20) = 'Sunday';
DECLARE @CurrentTime TIME(0) = '10:00:00';

SELECT TOP 1 id, course, title, day, CONVERT(VARCHAR(5), start_time, 108) AS start_time, CONVERT(VARCHAR(5), end_time, 108) AS end_time, room, instructor
FROM dbo.Schedules
WHERE day = @CurrentDay AND start_time >= @CurrentTime
ORDER BY start_time ASC;


-- ============================================================================
-- 2. ROOMS & AVAILABILITY OPERATIONS
-- ============================================================================

-- 2.1 List all rooms
SELECT id, room_number, type, capacity, equipment, floor, status
FROM dbo.Rooms
ORDER BY floor, room_number;

-- 2.2 Filter rooms by capacity and equipment
-- Sample query: "Which labs have a projector and can fit at least 30 people?"
SELECT id, room_number, type, capacity, equipment, floor
FROM dbo.Rooms
WHERE type = 'lab'
  AND capacity >= 30
  AND EXISTS (SELECT 1 FROM OPENJSON(equipment) WHERE value = 'projector')
ORDER BY capacity ASC;

-- 2.3 Filter rooms for: "I need a room for 5 people with a projector tomorrow between 2 and 4"
-- Tomorrow: 2026-09-05 (Saturday - no regular classes, but checks room bookings)
DECLARE @TargetDate DATE = '2026-09-05';
DECLARE @StartSlot TIME(0) = '14:00';
DECLARE @EndSlot TIME(0) = '16:00';
DECLARE @DayName VARCHAR(20) = DATENAME(WEEKDAY, @TargetDate);

SELECT r.id, r.room_number, r.type, r.capacity, r.equipment, r.floor
FROM dbo.Rooms r
WHERE r.status = 'available'
  AND r.capacity >= 5
  AND EXISTS (SELECT 1 FROM OPENJSON(r.equipment) WHERE value = 'projector')
  AND NOT EXISTS (
      SELECT 1 FROM dbo.RoomBookings b
      WHERE b.room_id = r.id AND b.date = @TargetDate AND b.status = 'confirmed'
        AND (b.start_time < @EndSlot AND b.end_time > @StartSlot)
  )
  AND NOT EXISTS (
      SELECT 1 FROM dbo.Schedules s
      WHERE s.room = r.room_number AND s.day = @DayName
        AND (s.start_time < @EndSlot AND s.end_time > @StartSlot)
  )
ORDER BY r.capacity ASC;


-- ============================================================================
-- 3. ROOM BOOKINGS OPERATIONS
-- ============================================================================

-- 3.1 List active bookings with room details
SELECT 
    b.booking_id,
    r.room_number,
    r.type AS room_type,
    b.booked_by,
    b.date,
    CONVERT(VARCHAR(5), b.start_time, 108) AS start_time,
    CONVERT(VARCHAR(5), b.end_time, 108) AS end_time,
    b.purpose,
    b.status
FROM dbo.RoomBookings b
JOIN dbo.Rooms r ON b.room_id = r.id
ORDER BY b.date, b.start_time;

-- 3.2 Check overlapping bookings for a specific room
-- Sample: Check if 7A02 is free tomorrow between 15:00 and 17:00
EXEC dbo.sp_CheckRoomAvailability 
    @RoomIdentifier = '7A02', 
    @Date = '2026-09-05', 
    @StartTime = '15:00', 
    @EndTime = '17:00',
    @IsAvailable = NULL,
    @ConflictReason = NULL;

-- 3.3 Create a booking
-- Sample query: "Book Room 7A02 tomorrow from 3 PM to 5 PM."
EXEC dbo.sp_BookRoom
    @RoomIdentifier = '7A02',
    @BookedBy = 'Sakibul Hassan',
    @Date = '2026-09-05',
    @StartTime = '15:00',
    @EndTime = '17:00',
    @Purpose = 'Group Study for AI Hackathon';

-- 3.4 Cancel a booking
EXEC dbo.sp_CancelRoomBooking @BookingId = 'bk-002';


-- ============================================================================
-- 4. EVENTS OPERATIONS
-- ============================================================================

-- 4.1 List upcoming events with venue and remaining capacity
SELECT 
    id,
    name,
    description,
    date,
    CONVERT(VARCHAR(5), start_time, 108) AS start_time,
    CONVERT(VARCHAR(5), end_time, 108) AS end_time,
    end_date,
    venue,
    organizer,
    capacity,
    registered,
    capacity - registered AS remaining_seats,
    status
FROM dbo.Events
ORDER BY date ASC, start_time ASC;

-- 4.2 Find events by date range or specific date
SELECT id, name, venue, start_time, end_time, status
FROM dbo.Events
WHERE date = '2026-09-08'
ORDER BY start_time ASC;

-- 4.3 Find event by name keyword
-- Sample: "Guest Lecture on Deep Learning"
SELECT id, name, description, date, start_time, end_time, venue, capacity, registered, status
FROM dbo.Events
WHERE name LIKE '%Deep Learning%';

-- 4.4 Multi-Source Reasoning: Free time between classes and campus events
-- Sample query: "I'm free until 2 PM — is there anything on campus I could drop into?"
DECLARE @FreeUntil TIME(0) = '14:00';
DECLARE @TodayDate DATE = '2026-09-08';

SELECT id, name, venue, date, CONVERT(VARCHAR(5), start_time, 108) AS start_time, CONVERT(VARCHAR(5), end_time, 108) AS end_time, organizer, status
FROM dbo.Events
WHERE date = @TodayDate 
  AND start_time < @FreeUntil
  AND status <> 'cancelled';


-- ============================================================================
-- 5. EVENT REGISTRATIONS OPERATIONS
-- ============================================================================

-- 5.1 Register a student for an event
-- Sample query: "Register me for the Guest Lecture on Deep Learning."
EXEC dbo.sp_RegisterForEvent
    @EventId = 'evt-002',
    @StudentId = '22-42001',
    @Name = 'Tanjim Rahman';

-- 5.2 View all registrations for a specific event
SELECT r.registration_id, r.student_id, r.name, r.registered_at, r.status
FROM dbo.EventRegistrations r
WHERE r.event_id = 'evt-001'
ORDER BY r.registered_at ASC;

-- 5.3 Cancel student registration
EXEC dbo.sp_CancelEventRegistration
    @EventId = 'evt-002',
    @StudentId = '22-42001';


-- ============================================================================
-- 6. ANNOUNCEMENTS OPERATIONS
-- ============================================================================

-- 6.1 List all active (non-expired) announcements
SELECT id, title, body, date, priority, posted_by, expires
FROM dbo.Announcements
WHERE expires >= CAST(GETDATE() AS DATE)
ORDER BY 
    CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
    END, 
    date DESC;

-- 6.2 Filter high priority announcements
-- Sample query: "Show me all high priority announcements."
SELECT id, title, body, date, priority, posted_by
FROM dbo.Announcements
WHERE priority = 'high'
ORDER BY date DESC;


-- ============================================================================
-- 7. ASSIGNMENTS OPERATIONS
-- ============================================================================

-- 7.1 List all assignments ordered by deadline
SELECT id, course, course_title, title, deadline, submission_platform, status, marks
FROM dbo.Assignments
ORDER BY deadline ASC;

-- 7.2 What assignments do I have due this week?
-- Sample query: "What assignments do I have due this week?"
-- Week window: between 2026-09-04 and 2026-09-11
SELECT id, course, course_title, title, deadline, submission_platform, status, marks
FROM dbo.Assignments
WHERE deadline BETWEEN '2026-09-04' AND '2026-09-11'
  AND status <> 'submitted'
ORDER BY deadline ASC;

-- 7.3 Filter assignments by course
SELECT id, title, description, deadline, status, marks
FROM dbo.Assignments
WHERE course = 'CSE 4113';
GO
