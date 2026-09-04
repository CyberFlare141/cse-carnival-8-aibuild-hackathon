-- ============================================================================
-- CampusOS Stored Procedures & Backend Operations
-- Database: Microsoft SQL Server
-- Target: CampusOS
-- ============================================================================

USE CampusOS;
GO

-- ============================================================================
-- 1. SEQUENCE FOR BOOKING IDs
-- ============================================================================
IF OBJECT_ID('dbo.seq_BookingId', 'SO') IS NULL
BEGIN
    CREATE SEQUENCE dbo.seq_BookingId
        START WITH 10
        INCREMENT BY 1;
END
GO

-- ============================================================================
-- 2. STORED PROCEDURE: sp_CheckRoomAvailability
-- Checks whether a specific room is available on a given date and time window.
-- Checks both confirmed bookings AND recurring class timetable schedules.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_CheckRoomAvailability
    @RoomIdentifier VARCHAR(50), -- Room id (e.g. 'room-002') or room_number (e.g. '7A02')
    @Date           DATE,
    @StartTime      TIME(0),
    @EndTime        TIME(0),
    @IsAvailable    BIT OUTPUT,
    @ConflictReason NVARCHAR(255) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate time range
    IF @StartTime >= @EndTime
    BEGIN
        SET @IsAvailable = 0;
        SET @ConflictReason = 'Invalid time window: start_time must be earlier than end_time.';
        SELECT @IsAvailable AS is_available, @ConflictReason AS conflict_reason;
        RETURN;
    END

    -- Resolve room
    DECLARE @RoomId VARCHAR(50);
    DECLARE @RoomNumber VARCHAR(50);
    DECLARE @RoomStatus VARCHAR(50);

    SELECT TOP 1 
        @RoomId = id, 
        @RoomNumber = room_number, 
        @RoomStatus = status
    FROM dbo.Rooms
    WHERE id = @RoomIdentifier OR room_number = @RoomIdentifier;

    IF @RoomId IS NULL
    BEGIN
        SET @IsAvailable = 0;
        SET @ConflictReason = 'Room not found: ' + @RoomIdentifier;
        SELECT @IsAvailable AS is_available, @ConflictReason AS conflict_reason;
        RETURN;
    END

    IF @RoomStatus <> 'available'
    BEGIN
        SET @IsAvailable = 0;
        SET @ConflictReason = 'Room ' + @RoomNumber + ' is marked as ' + @RoomStatus + '.';
        SELECT @IsAvailable AS is_available, @ConflictReason AS conflict_reason;
        RETURN;
    END

    -- 1. Check for overlapping confirmed RoomBookings on this specific date
    DECLARE @BookingConflict NVARCHAR(255);
    SELECT TOP 1 
        @BookingConflict = 'Room already booked by ' + booked_by + ' (' + purpose + ') from ' + 
                           CONVERT(VARCHAR(5), start_time, 108) + ' to ' + 
                           CONVERT(VARCHAR(5), end_time, 108)
    FROM dbo.RoomBookings
    WHERE room_id = @RoomId
      AND date = @Date
      AND status = 'confirmed'
      AND (start_time < @EndTime AND end_time > @StartTime);

    IF @BookingConflict IS NOT NULL
    BEGIN
        SET @IsAvailable = 0;
        SET @ConflictReason = @BookingConflict;
        SELECT @IsAvailable AS is_available, @ConflictReason AS conflict_reason;
        RETURN;
    END

    -- 2. Check for overlapping class timetable schedules for this day of week
    DECLARE @DayOfWeek VARCHAR(20) = DATENAME(WEEKDAY, @Date);
    DECLARE @ScheduleConflict NVARCHAR(255);

    SELECT TOP 1 
        @ScheduleConflict = 'Class scheduled: ' + course + ' (' + title + ') from ' + 
                            CONVERT(VARCHAR(5), start_time, 108) + ' to ' + 
                            CONVERT(VARCHAR(5), end_time, 108)
    FROM dbo.Schedules
    WHERE room = @RoomNumber
      AND day = @DayOfWeek
      AND (start_time < @EndTime AND end_time > @StartTime);

    IF @ScheduleConflict IS NOT NULL
    BEGIN
        SET @IsAvailable = 0;
        SET @ConflictReason = @ScheduleConflict;
        SELECT @IsAvailable AS is_available, @ConflictReason AS conflict_reason;
        RETURN;
    END

    -- No conflicts found
    SET @IsAvailable = 1;
    SET @ConflictReason = NULL;
    SELECT @IsAvailable AS is_available, 'Room is available' AS conflict_reason;
END;
GO

-- ============================================================================
-- 3. STORED PROCEDURE: sp_FindAvailableRooms
-- Finds rooms meeting capacity, type, and equipment requirements that are free
-- during a specific date and time window.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_FindAvailableRooms
    @Date               DATE,
    @StartTime          TIME(0),
    @EndTime            TIME(0),
    @MinCapacity        INT = NULL,
    @RoomType           VARCHAR(50) = NULL,
    @RequiredEquipment  NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DayOfWeek VARCHAR(20) = DATENAME(WEEKDAY, @Date);

    SELECT 
        r.id,
        r.room_number,
        r.type,
        r.capacity,
        r.equipment,
        r.floor,
        r.status
    FROM dbo.Rooms r
    WHERE r.status = 'available'
      -- Capacity filter
      AND (@MinCapacity IS NULL OR r.capacity >= @MinCapacity)
      -- Type filter (classroom, lab, seminar)
      AND (@RoomType IS NULL OR r.type = @RoomType)
      -- Equipment filter (checks inside JSON array)
      AND (
          @RequiredEquipment IS NULL 
          OR EXISTS (
              SELECT 1 FROM OPENJSON(r.equipment) eq 
              WHERE LOWER(eq.value) = LOWER(@RequiredEquipment)
          )
      )
      -- No overlapping confirmed bookings on @Date
      AND NOT EXISTS (
          SELECT 1 FROM dbo.RoomBookings b
          WHERE b.room_id = r.id
            AND b.date = @Date
            AND b.status = 'confirmed'
            AND (b.start_time < @EndTime AND b.end_time > @StartTime)
      )
      -- No overlapping class schedules on this day of week
      AND NOT EXISTS (
          SELECT 1 FROM dbo.Schedules s
          WHERE s.room = r.room_number
            AND s.day = @DayOfWeek
            AND (s.start_time < @EndTime AND s.end_time > @StartTime)
      )
    ORDER BY r.capacity ASC, r.room_number ASC;
END;
GO

-- ============================================================================
-- 4. STORED PROCEDURE: sp_BookRoom
-- Safely books a room if no conflicting booking or class schedule exists.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_BookRoom
    @RoomIdentifier VARCHAR(50),
    @BookedBy       VARCHAR(150),
    @Date           DATE,
    @StartTime      TIME(0),
    @EndTime        TIME(0),
    @Purpose        NVARCHAR(500),
    @BookingId      VARCHAR(50) = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    -- Validate times
    IF @StartTime >= @EndTime
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 0 AS is_success, 'Invalid time window: start_time must be earlier than end_time.' AS message, NULL AS booking_id;
        RETURN;
    END

    -- Resolve room
    DECLARE @RoomId VARCHAR(50);
    DECLARE @RoomNumber VARCHAR(50);
    SELECT TOP 1 @RoomId = id, @RoomNumber = room_number FROM dbo.Rooms WITH (UPDLOCK, HOLDLOCK)
    WHERE id = @RoomIdentifier OR room_number = @RoomIdentifier;

    IF @RoomId IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 0 AS is_success, 'Room not found: ' + @RoomIdentifier AS message, NULL AS booking_id;
        RETURN;
    END

    -- Check availability
    DECLARE @DayOfWeek VARCHAR(20) = DATENAME(WEEKDAY, @Date);

    -- Check existing bookings
    IF EXISTS (
        SELECT 1 FROM dbo.RoomBookings WITH (UPDLOCK, HOLDLOCK)
        WHERE room_id = @RoomId
          AND date = @Date
          AND status = 'confirmed'
          AND (start_time < @EndTime AND end_time > @StartTime)
    )
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 0 AS is_success, 'Room ' + @RoomNumber + ' already has a confirmed booking in this time window.' AS message, NULL AS booking_id;
        RETURN;
    END

    -- Check class schedules
    IF EXISTS (
        SELECT 1 FROM dbo.Schedules
        WHERE room = @RoomNumber
          AND day = @DayOfWeek
          AND (start_time < @EndTime AND end_time > @StartTime)
    )
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 0 AS is_success, 'Room ' + @RoomNumber + ' has a regular class scheduled in this time window on ' + @DayOfWeek + '.' AS message, NULL AS booking_id;
        RETURN;
    END

    -- Generate booking_id if not supplied
    IF @BookingId IS NULL OR LTRIM(RTRIM(@BookingId)) = ''
    BEGIN
        SET @BookingId = 'bk-' + RIGHT('000' + CAST(NEXT VALUE FOR dbo.seq_BookingId AS VARCHAR(10)), 3);
    END

    -- Insert booking
    INSERT INTO dbo.RoomBookings (booking_id, room_id, booked_by, date, start_time, end_time, purpose, status)
    VALUES (@BookingId, @RoomId, @BookedBy, @Date, @StartTime, @EndTime, @Purpose, 'confirmed');

    COMMIT TRANSACTION;

    SELECT 1 AS is_success, 'Room ' + @RoomNumber + ' successfully booked.' AS message, @BookingId AS booking_id;
END;
GO

-- ============================================================================
-- 5. STORED PROCEDURE: sp_CancelRoomBooking
-- Cancels a room booking by its booking_id.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_CancelRoomBooking
    @BookingId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.RoomBookings WHERE booking_id = @BookingId)
    BEGIN
        SELECT 0 AS is_success, 'Booking ID not found: ' + @BookingId AS message;
        RETURN;
    END

    UPDATE dbo.RoomBookings
    SET status = 'cancelled',
        updated_at = SYSDATETIME()
    WHERE booking_id = @BookingId;

    SELECT 1 AS is_success, 'Booking ' + @BookingId + ' has been cancelled.' AS message;
END;
GO

-- ============================================================================
-- 6. STORED PROCEDURE: sp_RegisterForEvent
-- Registers a student for an event, validating capacity and avoiding duplicate registrations.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_RegisterForEvent
    @EventId    VARCHAR(50),
    @StudentId  VARCHAR(50),
    @Name       VARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    -- Lock event record
    DECLARE @Capacity INT;
    DECLARE @Registered INT;
    DECLARE @Status VARCHAR(50);
    DECLARE @EventName VARCHAR(255);

    SELECT 
        @Capacity = capacity,
        @Registered = registered,
        @Status = status,
        @EventName = name
    FROM dbo.Events WITH (UPDLOCK, HOLDLOCK)
    WHERE id = @EventId;

    IF @Capacity IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 0 AS is_success, 'Event not found: ' + @EventId AS message, NULL AS registration_id;
        RETURN;
    END

    IF @Status IN ('cancelled', 'completed')
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 0 AS is_success, 'Event ' + @EventName + ' is ' + @Status + ' and not accepting registrations.' AS message, NULL AS registration_id;
        RETURN;
    END

    -- Check if student already registered
    IF EXISTS (
        SELECT 1 FROM dbo.EventRegistrations
        WHERE event_id = @EventId AND student_id = @StudentId AND status = 'confirmed'
    )
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 0 AS is_success, 'Student ' + @StudentId + ' is already registered for this event.' AS message, NULL AS registration_id;
        RETURN;
    END

    -- Check capacity
    IF @Registered >= @Capacity
    BEGIN
        -- Ensure status shows full
        UPDATE dbo.Events SET status = 'full', updated_at = SYSDATETIME() WHERE id = @EventId;
        ROLLBACK TRANSACTION;
        SELECT 0 AS is_success, 'Event ' + @EventName + ' is full (capacity: ' + CAST(@Capacity AS VARCHAR(10)) + ').' AS message, NULL AS registration_id;
        RETURN;
    END

    -- Insert registration
    INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status)
    VALUES (@EventId, @StudentId, @Name, 'confirmed');

    DECLARE @NewRegistrationId INT = SCOPE_IDENTITY();

    -- Update registered count on event
    UPDATE dbo.Events
    SET registered = registered + 1,
        status = CASE WHEN registered + 1 >= capacity THEN 'full' ELSE status END,
        updated_at = SYSDATETIME()
    WHERE id = @EventId;

    COMMIT TRANSACTION;

    SELECT 1 AS is_success, 'Student successfully registered for ' + @EventName AS message, @NewRegistrationId AS registration_id;
END;
GO

-- ============================================================================
-- 7. STORED PROCEDURE: sp_CancelEventRegistration
-- Cancels a student registration and adjusts the registered count.
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_CancelEventRegistration
    @EventId   VARCHAR(50),
    @StudentId VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.EventRegistrations WITH (UPDLOCK, HOLDLOCK)
        WHERE event_id = @EventId AND student_id = @StudentId AND status = 'confirmed'
    )
    BEGIN
        ROLLBACK TRANSACTION;
        SELECT 0 AS is_success, 'Active registration not found for student ' + @StudentId + ' in event ' + @EventId AS message;
        RETURN;
    END

    -- Remove or mark cancelled
    DELETE FROM dbo.EventRegistrations
    WHERE event_id = @EventId AND student_id = @StudentId;

    -- Decrement registered count and unmark 'full' if needed
    UPDATE dbo.Events
    SET registered = CASE WHEN registered > 0 THEN registered - 1 ELSE 0 END,
        status = CASE WHEN status = 'full' THEN 'upcoming' ELSE status END,
        updated_at = SYSDATETIME()
    WHERE id = @EventId;

    COMMIT TRANSACTION;

    SELECT 1 AS is_success, 'Registration successfully cancelled.' AS message;
END;
GO
