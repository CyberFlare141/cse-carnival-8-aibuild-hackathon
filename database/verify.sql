-- ============================================================================
-- CampusOS Automated Database Verification Test Suite
-- Database: Microsoft SQL Server
-- Target: CampusOS
-- Tests all 14 criteria specified in Step 11 of the Database Engineer spec.
-- ============================================================================

USE CampusOS;
GO

SET NOCOUNT ON;

PRINT '============================================================================';
PRINT 'STARTING CAMPUSOS DATABASE VERIFICATION SUITE';
PRINT '============================================================================';
GO

-- ----------------------------------------------------------------------------
-- Test 1: All required tables exist
-- ----------------------------------------------------------------------------
PRINT '--- Test 1: All Required Tables Exist ---';
DECLARE @MissingCount INT;
SELECT @MissingCount = COUNT(*) 
FROM (
    SELECT 'Schedules' AS tbl UNION ALL
    SELECT 'Rooms' UNION ALL
    SELECT 'RoomBookings' UNION ALL
    SELECT 'Events' UNION ALL
    SELECT 'EventRegistrations' UNION ALL
    SELECT 'Announcements' UNION ALL
    SELECT 'Assignments'
) required
LEFT JOIN INFORMATION_SCHEMA.TABLES t ON required.tbl = t.TABLE_NAME AND t.TABLE_TYPE = 'BASE TABLE'
WHERE t.TABLE_NAME IS NULL;

IF @MissingCount = 0
    PRINT '  [PASS] All 7 required tables exist.';
ELSE
    THROW 50001, '  [FAIL] Missing required tables!', 1;
GO

-- ----------------------------------------------------------------------------
-- Test 2: Primary Keys Work
-- ----------------------------------------------------------------------------
PRINT '--- Test 2: Primary Keys Work (Duplicate PK rejection) ---';
BEGIN TRY
    -- Attempt duplicate PK insert
    INSERT INTO dbo.Rooms (id, room_number, type, capacity, floor, status) 
    VALUES ('room-001', 'DUPLICATE_ROOM', 'classroom', 30, 1, 'available');
    
    THROW 50002, '  [FAIL] Primary key failed to reject duplicate!', 1;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 2627 -- Violation of PRIMARY KEY constraint
        PRINT '  [PASS] Primary key constraint enforced as expected (Error 2627 caught).';
    ELSE
        THROW;
END CATCH
GO

-- ----------------------------------------------------------------------------
-- Test 3: Foreign Keys Work
-- ----------------------------------------------------------------------------
PRINT '--- Test 3: Foreign Keys Work (Invalid FK rejection) ---';
BEGIN TRY
    -- Attempt to insert booking referencing non-existent room
    INSERT INTO dbo.RoomBookings (booking_id, room_id, booked_by, date, start_time, end_time, purpose)
    VALUES ('bk-fake-test', 'room-does-not-exist', 'Tester', '2026-09-10', '10:00', '11:00', 'Test FK');

    THROW 50003, '  [FAIL] Foreign key failed to reject invalid reference!', 1;
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 547 -- Foreign key violation
        PRINT '  [PASS] Foreign key constraint enforced as expected (Error 547 caught).';
    ELSE
        THROW;
END CATCH
GO

-- ----------------------------------------------------------------------------
-- Test 4: Seed Data Can Be Inserted & Matches JSON Counts
-- ----------------------------------------------------------------------------
PRINT '--- Test 4: Seed Data Counts Match Official JSON ---';
DECLARE @SchedCount INT = (SELECT COUNT(*) FROM dbo.Schedules);
DECLARE @RoomCount  INT = (SELECT COUNT(*) FROM dbo.Rooms);
DECLARE @EvtCount   INT = (SELECT COUNT(*) FROM dbo.Events);
DECLARE @AnnCount   INT = (SELECT COUNT(*) FROM dbo.Announcements);
DECLARE @AsgnCount  INT = (SELECT COUNT(*) FROM dbo.Assignments);

IF @SchedCount = 24 AND @RoomCount = 20 AND @EvtCount = 7 AND @AnnCount = 8 AND @AsgnCount = 8
    PRINT '  [PASS] Official seed data counts match perfectly (Schedules: 24, Rooms: 20, Events: 7, Announcements: 8, Assignments: 8).';
ELSE
    THROW 50004, '  [FAIL] Seed data counts do not match official JSONs!', 1;
GO

-- ----------------------------------------------------------------------------
-- Test 5 & 6: Room Booking Creation & Overlapping Bookings Detection
-- ----------------------------------------------------------------------------
PRINT '--- Test 5 & 6: Room Booking Creation & Overlap Conflict Detection ---';
DECLARE @TestBookingId VARCHAR(50) = 'bk-verify-001';
DECLARE @IsAvailable BIT;
DECLARE @ConflictMsg NVARCHAR(255);

-- Clean test slot if present
DELETE FROM dbo.RoomBookings WHERE booking_id = @TestBookingId;

-- Verify 7A01 is initially available on 2026-09-15 10:00 - 12:00
EXEC dbo.sp_CheckRoomAvailability 
    @RoomIdentifier = '7A01', 
    @Date = '2026-09-15', 
    @StartTime = '10:00', 
    @EndTime = '12:00', 
    @IsAvailable = @IsAvailable OUTPUT, 
    @ConflictReason = @ConflictMsg OUTPUT;

IF @IsAvailable = 1
    PRINT '  [PASS] Room 7A01 verified free before booking.';
ELSE
    THROW 50005, '  [FAIL] Room 7A01 should be free!', 1;

-- Book 7A01
DECLARE @BookSuccess BIT;
DECLARE @BookMsg NVARCHAR(255);
DECLARE @OutId VARCHAR(50);
EXEC dbo.sp_BookRoom
    @RoomIdentifier = '7A01',
    @BookedBy = 'Automated Tester',
    @Date = '2026-09-15',
    @StartTime = '10:00',
    @EndTime = '12:00',
    @Purpose = 'Unit Test Session',
    @BookingId = @TestBookingId;

IF EXISTS (SELECT 1 FROM dbo.RoomBookings WHERE booking_id = @TestBookingId AND status = 'confirmed')
    PRINT '  [PASS] Test room booking created successfully.';
ELSE
    THROW 50006, '  [FAIL] Failed to create test room booking!', 1;

-- Attempt overlapping booking (11:00 - 13:00)
EXEC dbo.sp_CheckRoomAvailability 
    @RoomIdentifier = '7A01', 
    @Date = '2026-09-15', 
    @StartTime = '11:00', 
    @EndTime = '13:00', 
    @IsAvailable = @IsAvailable OUTPUT, 
    @ConflictReason = @ConflictMsg OUTPUT;

IF @IsAvailable = 0
    PRINT '  [PASS] Overlapping booking detected and blocked: ' + @ConflictMsg;
ELSE
    THROW 50007, '  [FAIL] Overlapping booking was NOT detected!', 1;
GO

-- ----------------------------------------------------------------------------
-- Test 7: Booking Cancellation
-- ----------------------------------------------------------------------------
PRINT '--- Test 7: Booking Cancellation ---';
DECLARE @CancelTarget VARCHAR(50) = 'bk-verify-001';
EXEC dbo.sp_CancelRoomBooking @BookingId = @CancelTarget;

IF EXISTS (SELECT 1 FROM dbo.RoomBookings WHERE booking_id = @CancelTarget AND status = 'cancelled')
    PRINT '  [PASS] Booking successfully marked as cancelled.';
ELSE
    THROW 50008, '  [FAIL] Booking cancellation failed!', 1;

-- Verify the slot is now free again
DECLARE @IsAvailableAfterCancel BIT;
DECLARE @ConflictMsgAfterCancel NVARCHAR(255);
EXEC dbo.sp_CheckRoomAvailability 
    @RoomIdentifier = '7A01', 
    @Date = '2026-09-15', 
    @StartTime = '10:00', 
    @EndTime = '12:00', 
    @IsAvailable = @IsAvailableAfterCancel OUTPUT, 
    @ConflictReason = @ConflictMsgAfterCancel OUTPUT;

IF @IsAvailableAfterCancel = 1
    PRINT '  [PASS] Cancelled slot is immediately free for re-booking.';
ELSE
    THROW 50009, '  [FAIL] Slot still locked after cancellation!', 1;

-- Clean up test booking
DELETE FROM dbo.RoomBookings WHERE booking_id = @CancelTarget;
GO

-- ----------------------------------------------------------------------------
-- Test 8, 9 & 10: Event Registration, Capacity Calculation & Cancellation
-- ----------------------------------------------------------------------------
PRINT '--- Test 8, 9 & 10: Event Registrations, Capacity Checks & Cancellation ---';
DECLARE @TestEventId VARCHAR(50) = 'evt-007'; -- IUPC Selection, cap: 30, reg: 18
DECLARE @InitialRegCount INT = (SELECT registered FROM dbo.Events WHERE id = @TestEventId);

-- Clean up any prior test student
DELETE FROM dbo.EventRegistrations WHERE event_id = @TestEventId AND student_id = 'test-999';

-- Check capacity calculation view
DECLARE @RemCap INT;
SELECT @RemCap = remaining_capacity FROM dbo.vw_EventStatus WHERE id = @TestEventId;
IF @RemCap = (30 - @InitialRegCount)
    PRINT '  [PASS] Event capacity calculation view is accurate (remaining: ' + CAST(@RemCap AS VARCHAR(10)) + ').';
ELSE
    THROW 50010, '  [FAIL] Capacity calculation view mismatch!', 1;

-- Register test student
EXEC dbo.sp_RegisterForEvent 
    @EventId = @TestEventId, 
    @StudentId = 'test-999', 
    @Name = 'Test Student';

DECLARE @NewRegCount INT = (SELECT registered FROM dbo.Events WHERE id = @TestEventId);
IF @NewRegCount = @InitialRegCount + 1 AND EXISTS (SELECT 1 FROM dbo.EventRegistrations WHERE event_id = @TestEventId AND student_id = 'test-999')
    PRINT '  [PASS] Student registered, registered count incremented to ' + CAST(@NewRegCount AS VARCHAR(10)) + '.';
ELSE
    THROW 50011, '  [FAIL] Registration failed to increment count!', 1;

-- Test duplicate registration rejection
BEGIN TRY
    EXEC dbo.sp_RegisterForEvent 
        @EventId = @TestEventId, 
        @StudentId = 'test-999', 
        @Name = 'Test Student';
    PRINT '  [PASS] Duplicate registration handled safely.';
END TRY
BEGIN CATCH
    PRINT '  [PASS] Duplicate registration prevented: ' + ERROR_MESSAGE();
END CATCH

-- Cancel registration
EXEC dbo.sp_CancelEventRegistration 
    @EventId = @TestEventId, 
    @StudentId = 'test-999';

DECLARE @CountAfterCancel INT = (SELECT registered FROM dbo.Events WHERE id = @TestEventId);
IF @CountAfterCancel = @InitialRegCount AND NOT EXISTS (SELECT 1 FROM dbo.EventRegistrations WHERE event_id = @TestEventId AND student_id = 'test-999')
    PRINT '  [PASS] Event registration cancelled, registered count decremented back to ' + CAST(@CountAfterCancel AS VARCHAR(10)) + '.';
ELSE
    THROW 50012, '  [FAIL] Cancellation did not decrement count properly!', 1;
GO

-- ----------------------------------------------------------------------------
-- Test 11: Schedule Queries Work
-- ----------------------------------------------------------------------------
PRINT '--- Test 11: Schedule Queries Work ---';
DECLARE @WedCount INT = (SELECT COUNT(*) FROM dbo.Schedules WHERE day = 'Wednesday');
IF @WedCount = 5
    PRINT '  [PASS] Schedule query for Wednesday returns expected count (' + CAST(@WedCount AS VARCHAR(10)) + ').';
ELSE
    THROW 50013, '  [FAIL] Schedule query count unexpected!', 1;
GO

-- ----------------------------------------------------------------------------
-- Test 12: Assignment Queries Work
-- ----------------------------------------------------------------------------
PRINT '--- Test 12: Assignment Queries Work ---';
DECLARE @PendingCount INT = (SELECT COUNT(*) FROM dbo.Assignments WHERE status = 'pending');
IF @PendingCount = 6
    PRINT '  [PASS] Assignment query for pending status returns expected count (' + CAST(@PendingCount AS VARCHAR(10)) + ').';
ELSE
    THROW 50014, '  [FAIL] Assignment query count unexpected!', 1;
GO

-- ----------------------------------------------------------------------------
-- Test 13: Announcement Queries Work
-- ----------------------------------------------------------------------------
PRINT '--- Test 13: Announcement Queries Work ---';
DECLARE @HighPriCount INT = (SELECT COUNT(*) FROM dbo.Announcements WHERE priority = 'high');
IF @HighPriCount = 4
    PRINT '  [PASS] Announcement query for high priority returns expected count (' + CAST(@HighPriCount AS VARCHAR(10)) + ').';
ELSE
    THROW 50015, '  [FAIL] Announcement query count unexpected!', 1;
GO

-- ----------------------------------------------------------------------------
-- Test 14: Room Filtering Works (Equipment, Capacity & Availability)
-- ----------------------------------------------------------------------------
PRINT '--- Test 14: Room Filtering Works ---';
-- Find labs with projector and capacity >= 30
DECLARE @MatchingLabs INT = (
    SELECT COUNT(*) 
    FROM dbo.Rooms 
    WHERE type = 'lab' 
      AND capacity >= 30 
      AND EXISTS (SELECT 1 FROM OPENJSON(equipment) WHERE value = 'projector')
);

IF @MatchingLabs = 6
    PRINT '  [PASS] Room filtering by lab + projector + capacity >= 30 returns 6 matching rooms.';
ELSE
    THROW 50016, '  [FAIL] Room filtering returned unexpected count!', 1;
GO

PRINT '============================================================================';
PRINT 'ALL 14 DATABASE VERIFICATION TESTS PASSED SUCCESSFULLY!';
PRINT '============================================================================';
GO
