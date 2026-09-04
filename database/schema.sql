-- ============================================================================
-- CampusOS Database Foundation Schema
-- Database: Microsoft SQL Server
-- Target: CampusOS
-- ============================================================================

-- Ensure CampusOS database exists
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'CampusOS')
BEGIN
    CREATE DATABASE CampusOS;
END
GO

USE CampusOS;
GO

-- ============================================================================
-- 1. DROP EXISTING OBJECTS (Reverse Dependency Order)
-- ============================================================================

IF OBJECT_ID('dbo.vw_RoomEquipment', 'V') IS NOT NULL DROP VIEW dbo.vw_RoomEquipment;
IF OBJECT_ID('dbo.vw_EventStatus', 'V') IS NOT NULL DROP VIEW dbo.vw_EventStatus;
IF OBJECT_ID('dbo.vw_RoomScheduleBookings', 'V') IS NOT NULL DROP VIEW dbo.vw_RoomScheduleBookings;
IF OBJECT_ID('dbo.vw_RoomDetails', 'V') IS NOT NULL DROP VIEW dbo.vw_RoomDetails;

IF OBJECT_ID('dbo.EventRegistrations', 'U') IS NOT NULL DROP TABLE dbo.EventRegistrations;
IF OBJECT_ID('dbo.RoomBookings', 'U') IS NOT NULL DROP TABLE dbo.RoomBookings;
IF OBJECT_ID('dbo.Events', 'U') IS NOT NULL DROP TABLE dbo.Events;
IF OBJECT_ID('dbo.Rooms', 'U') IS NOT NULL DROP TABLE dbo.Rooms;
IF OBJECT_ID('dbo.Schedules', 'U') IS NOT NULL DROP TABLE dbo.Schedules;
IF OBJECT_ID('dbo.Announcements', 'U') IS NOT NULL DROP TABLE dbo.Announcements;
IF OBJECT_ID('dbo.Assignments', 'U') IS NOT NULL DROP TABLE dbo.Assignments;
GO

-- ============================================================================
-- 2. CREATE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: Schedules (Class Timetable)
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.Schedules (
    id          VARCHAR(50)     NOT NULL,
    course      VARCHAR(50)     NOT NULL,
    title       VARCHAR(255)    NOT NULL,
    day         VARCHAR(20)     NOT NULL,
    start_time  TIME(0)         NOT NULL,
    end_time    TIME(0)         NOT NULL,
    room        VARCHAR(50)     NOT NULL,
    instructor  VARCHAR(150)    NOT NULL,
    section     VARCHAR(50)     NOT NULL,
    created_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    updated_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Schedules PRIMARY KEY CLUSTERED (id),
    CONSTRAINT CK_Schedules_Day CHECK (day IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday')),
    CONSTRAINT CK_Schedules_Time CHECK (start_time < end_time)
);
GO

-- ----------------------------------------------------------------------------
-- Table 2: Rooms
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.Rooms (
    id          VARCHAR(50)     NOT NULL,
    room_number VARCHAR(50)     NOT NULL,
    type        VARCHAR(50)     NOT NULL,
    capacity    INT             NOT NULL,
    equipment   NVARCHAR(500)   NOT NULL DEFAULT '[]',
    floor       INT             NOT NULL,
    status      VARCHAR(50)     NOT NULL DEFAULT 'available',
    created_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    updated_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Rooms PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_Rooms_RoomNumber UNIQUE NONCLUSTERED (room_number),
    CONSTRAINT CK_Rooms_Type CHECK (type IN ('classroom', 'lab', 'seminar')),
    CONSTRAINT CK_Rooms_Capacity CHECK (capacity > 0),
    CONSTRAINT CK_Rooms_Floor CHECK (floor >= 0),
    CONSTRAINT CK_Rooms_Status CHECK (status IN ('available', 'unavailable')),
    CONSTRAINT CK_Rooms_Equipment_JSON CHECK (ISJSON(equipment) = 1)
);
GO

-- ----------------------------------------------------------------------------
-- Table 3: RoomBookings
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.RoomBookings (
    booking_id  VARCHAR(50)     NOT NULL,
    room_id     VARCHAR(50)     NOT NULL,
    booked_by   VARCHAR(150)    NOT NULL,
    date        DATE            NOT NULL,
    start_time  TIME(0)         NOT NULL,
    end_time    TIME(0)         NOT NULL,
    purpose     NVARCHAR(500)   NOT NULL,
    status      VARCHAR(50)     NOT NULL DEFAULT 'confirmed',
    created_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    updated_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT PK_RoomBookings PRIMARY KEY CLUSTERED (booking_id),
    CONSTRAINT FK_RoomBookings_Rooms FOREIGN KEY (room_id) REFERENCES dbo.Rooms(id) ON DELETE CASCADE,
    CONSTRAINT CK_RoomBookings_Time CHECK (start_time < end_time),
    CONSTRAINT CK_RoomBookings_Status CHECK (status IN ('confirmed', 'cancelled'))
);
GO

-- ----------------------------------------------------------------------------
-- Table 4: Events
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.Events (
    id          VARCHAR(50)     NOT NULL,
    name        VARCHAR(255)    NOT NULL,
    description NVARCHAR(MAX)   NOT NULL,
    date        DATE            NOT NULL,
    start_time  TIME(0)         NOT NULL,
    end_time    TIME(0)         NOT NULL,
    end_date    DATE            NOT NULL,
    venue       VARCHAR(50)     NOT NULL,
    organizer   VARCHAR(150)    NOT NULL,
    capacity    INT             NOT NULL,
    registered  INT             NOT NULL DEFAULT 0,
    status      VARCHAR(50)     NOT NULL DEFAULT 'upcoming',
    created_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    updated_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Events PRIMARY KEY CLUSTERED (id),
    CONSTRAINT CK_Events_Capacity CHECK (capacity > 0),
    CONSTRAINT CK_Events_Registered CHECK (registered >= 0),
    CONSTRAINT CK_Events_Status CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled', 'full')),
    CONSTRAINT CK_Events_DatesTimes CHECK (date < end_date OR (date = end_date AND start_time <= end_time))
);
GO

-- ----------------------------------------------------------------------------
-- Table 5: EventRegistrations
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.EventRegistrations (
    registration_id INT IDENTITY(1,1)   NOT NULL,
    event_id        VARCHAR(50)         NOT NULL,
    student_id      VARCHAR(50)         NOT NULL,
    name            VARCHAR(150)        NOT NULL,
    registered_at   DATETIME2           NOT NULL DEFAULT SYSDATETIME(),
    status          VARCHAR(50)         NOT NULL DEFAULT 'confirmed',
    CONSTRAINT PK_EventRegistrations PRIMARY KEY CLUSTERED (registration_id),
    CONSTRAINT FK_EventRegistrations_Events FOREIGN KEY (event_id) REFERENCES dbo.Events(id) ON DELETE CASCADE,
    CONSTRAINT UQ_EventRegistrations_Student UNIQUE NONCLUSTERED (event_id, student_id),
    CONSTRAINT CK_EventRegistrations_Status CHECK (status IN ('confirmed', 'cancelled'))
);
GO

-- ----------------------------------------------------------------------------
-- Table 6: Announcements
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.Announcements (
    id          VARCHAR(50)     NOT NULL,
    title       VARCHAR(255)    NOT NULL,
    body        NVARCHAR(MAX)   NOT NULL,
    date        DATE            NOT NULL,
    priority    VARCHAR(20)     NOT NULL,
    posted_by   VARCHAR(150)    NOT NULL,
    expires     DATE            NOT NULL,
    created_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    updated_at  DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Announcements PRIMARY KEY CLUSTERED (id),
    CONSTRAINT CK_Announcements_Priority CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT CK_Announcements_Dates CHECK (expires >= date)
);
GO

-- ----------------------------------------------------------------------------
-- Table 7: Assignments
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.Assignments (
    id                  VARCHAR(50)     NOT NULL,
    course              VARCHAR(50)     NOT NULL,
    course_title        VARCHAR(255)    NOT NULL,
    title               VARCHAR(255)    NOT NULL,
    description         NVARCHAR(MAX)   NOT NULL,
    assigned_date       DATE            NOT NULL,
    deadline            DATE            NOT NULL,
    submission_platform VARCHAR(150)    NOT NULL,
    status              VARCHAR(50)     NOT NULL,
    marks               INT             NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    updated_at          DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Assignments PRIMARY KEY CLUSTERED (id),
    CONSTRAINT CK_Assignments_Status CHECK (status IN ('pending', 'submitted', 'graded', 'late')),
    CONSTRAINT CK_Assignments_Marks CHECK (marks >= 0),
    CONSTRAINT CK_Assignments_Dates CHECK (deadline >= assigned_date)
);
GO

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Schedules lookup by day, time, course, room
CREATE NONCLUSTERED INDEX IX_Schedules_Day_Time ON dbo.Schedules (day, start_time, end_time);
CREATE NONCLUSTERED INDEX IX_Schedules_Course ON dbo.Schedules (course);
CREATE NONCLUSTERED INDEX IX_Schedules_Room ON dbo.Schedules (room);

-- Rooms lookup by capacity, type, status
CREATE NONCLUSTERED INDEX IX_Rooms_Type_Capacity ON dbo.Rooms (type, capacity) INCLUDE (room_number, status);

-- Bookings lookup by room and date
CREATE NONCLUSTERED INDEX IX_RoomBookings_Room_Date ON dbo.RoomBookings (room_id, date, status) INCLUDE (start_time, end_time);

-- Events lookup by date and status
CREATE NONCLUSTERED INDEX IX_Events_Date ON dbo.Events (date, status) INCLUDE (venue, capacity, registered);

-- EventRegistrations lookup by student
CREATE NONCLUSTERED INDEX IX_EventRegistrations_Student ON dbo.EventRegistrations (student_id);

-- Announcements lookup by priority and expiration
CREATE NONCLUSTERED INDEX IX_Announcements_Priority_Expires ON dbo.Announcements (priority, expires);

-- Assignments lookup by course and deadline
CREATE NONCLUSTERED INDEX IX_Assignments_Course_Deadline ON dbo.Assignments (course, deadline, status);
GO

-- ============================================================================
-- 4. CONVENIENCE VIEWS
-- ============================================================================

-- View: Unpacks JSON equipment array into relational rows
CREATE OR ALTER VIEW dbo.vw_RoomEquipment AS
SELECT 
    r.id AS room_id,
    r.room_number,
    r.type AS room_type,
    r.capacity,
    eq.value AS equipment_item
FROM dbo.Rooms r
CROSS APPLY OPENJSON(r.equipment) AS eq;
GO

-- View: Event capacity status with computed remaining capacity
CREATE OR ALTER VIEW dbo.vw_EventStatus AS
SELECT 
    e.id,
    e.name,
    e.date,
    e.start_time,
    e.end_time,
    e.venue,
    e.organizer,
    e.capacity,
    e.registered,
    CASE 
        WHEN e.capacity - e.registered <= 0 THEN 0 
        ELSE e.capacity - e.registered 
    END AS remaining_capacity,
    CASE 
        WHEN e.registered >= e.capacity THEN 1 
        ELSE 0 
    END AS is_full,
    e.status
FROM dbo.Events e;
GO

-- View: Room details with booking count
CREATE OR ALTER VIEW dbo.vw_RoomDetails AS
SELECT 
    r.id,
    r.room_number,
    r.type,
    r.capacity,
    r.equipment,
    r.floor,
    r.status,
    COUNT(b.booking_id) AS total_active_bookings
FROM dbo.Rooms r
LEFT JOIN dbo.RoomBookings b ON r.id = b.room_id AND b.status = 'confirmed'
GROUP BY r.id, r.room_number, r.type, r.capacity, r.equipment, r.floor, r.status;
GO

-- View: Unified room occupancy (Class Schedules & Confirmed Bookings)
CREATE OR ALTER VIEW dbo.vw_RoomScheduleBookings AS
SELECT 
    'schedule' AS source_type,
    s.id AS reference_id,
    s.room AS room_number,
    s.day AS day_of_week,
    CAST(NULL AS DATE) AS specific_date,
    s.start_time,
    s.end_time,
    s.course + ' - ' + s.title AS title_or_purpose,
    s.instructor AS booked_or_instructed_by
FROM dbo.Schedules s

UNION ALL

SELECT 
    'booking' AS source_type,
    b.booking_id AS reference_id,
    r.room_number,
    DATENAME(WEEKDAY, b.date) AS day_of_week,
    b.date AS specific_date,
    b.start_time,
    b.end_time,
    b.purpose AS title_or_purpose,
    b.booked_by AS booked_or_instructed_by
FROM dbo.RoomBookings b
JOIN dbo.Rooms r ON b.room_id = r.id
WHERE b.status = 'confirmed';
GO
