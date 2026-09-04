# CampusOS — Database Foundation

Welcome to the **CampusOS Database Foundation**. This subsystem provides a high-performance, resilient, relational database foundation built on **Microsoft SQL Server**, implementing the five campus data systems and core operations defined in `PROBLEM_STATEMENT.md` and `schema/schema.md`.

---

## 1. Directory Structure

All database artifacts are strictly contained in `database/`:

```
database/
├── schema.sql              # DDL: Database creation, tables, constraints, indexes, views
├── seed.sql                # DML: Complete official seed data matching data/*.json
├── seed_from_json.py       # Python generator & live importer from data/*.json
├── procedures.sql          # Stored procedures for booking, conflict detection & registrations
├── queries.sql             # SQL query patterns answering all sample & AI queries
├── verify.sql              # 14-test automated verification suite
└── README.md               # This documentation and FastAPI integration contract
```

---

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    Rooms ||--o{ RoomBookings : "has"
    Events ||--o{ EventRegistrations : "registers"

    Rooms {
        varchar(50) id PK
        varchar(50) room_number UK
        varchar(50) type
        int capacity
        nvarchar(500) equipment "JSON array"
        int floor
        varchar(50) status
        datetime2 created_at
        datetime2 updated_at
    }

    RoomBookings {
        varchar(50) booking_id PK
        varchar(50) room_id FK
        varchar(150) booked_by
        date date
        time(0) start_time
        time(0) end_time
        nvarchar(500) purpose
        varchar(50) status
        datetime2 created_at
        datetime2 updated_at
    }

    Schedules {
        varchar(50) id PK
        varchar(50) course
        varchar(255) title
        varchar(20) day
        time(0) start_time
        time(0) end_time
        varchar(50) room
        varchar(150) instructor
        varchar(50) section
        datetime2 created_at
        datetime2 updated_at
    }

    Events {
        varchar(50) id PK
        varchar(255) name
        nvarchar(max) description
        date date
        time(0) start_time
        time(0) end_time
        date end_date
        varchar(50) venue
        varchar(150) organizer
        int capacity
        int registered
        varchar(50) status
        datetime2 created_at
        datetime2 updated_at
    }

    EventRegistrations {
        int registration_id PK
        varchar(50) event_id FK
        varchar(50) student_id
        varchar(150) name
        datetime2 registered_at
        varchar(50) status
    }

    Announcements {
        varchar(50) id PK
        varchar(255) title
        nvarchar(max) body
        date date
        varchar(20) priority
        varchar(150) posted_by
        date expires
        datetime2 created_at
        datetime2 updated_at
    }

    Assignments {
        varchar(50) id PK
        varchar(50) course
        varchar(255) course_title
        varchar(255) title
        nvarchar(max) description
        date assigned_date
        date deadline
        varchar(150) submission_platform
        varchar(50) status
        int marks
        datetime2 created_at
        datetime2 updated_at
    }
```

---

## 3. Database Schema Overview

| Table | Purpose | Primary Key | Key Constraints |
|---|---|---|---|
| `Schedules` | Class timetable | `id` (e.g. `'sch-001'`) | `day` in Sun–Thu; `start_time < end_time` |
| `Rooms` | Campus rooms & facilities | `id` (e.g. `'room-001'`) | `room_number` UNIQUE; `type` in classroom/lab/seminar; `capacity > 0`; `ISJSON(equipment) = 1` |
| `RoomBookings` | Room reservations | `booking_id` (e.g. `'bk-001'`) | FK -> `Rooms(id)` ON DELETE CASCADE; `start_time < end_time`; `status` in confirmed/cancelled |
| `Events` | Campus events & hackathons | `id` (e.g. `'evt-001'`) | `capacity > 0`; `registered >= 0`; `status` in upcoming/ongoing/completed/cancelled/full |
| `EventRegistrations`| Student event registrations | `registration_id` (IDENTITY) | FK -> `Events(id)` ON DELETE CASCADE; UNIQUE `(event_id, student_id)` |
| `Announcements` | Campus notices & alerts | `id` (e.g. `'ann-001'`) | `priority` in high/medium/low; `expires >= date` |
| `Assignments` | Course coursework & deadlines | `id` (e.g. `'asgn-001'`) | `status` in pending/submitted/graded/late; `marks >= 0`; `deadline >= assigned_date` |

### Convenience Views
- **`vw_RoomEquipment`**: Normalizes `Rooms.equipment` JSON string into relational rows `(room_id, room_number, room_type, capacity, equipment_item)` using `CROSS APPLY OPENJSON()`.
- **`vw_EventStatus`**: Dynamically computes `remaining_capacity` (`capacity - registered`) and `is_full` flag.
- **`vw_RoomDetails`**: Displays rooms with active booking counts.
- **`vw_RoomScheduleBookings`**: Combines weekly class schedules and one-off bookings into a unified occupancy stream for scheduling collision detection.

---

## 4. How to Run the Database Scripts

### Option A: Using `sqlcmd` (Recommended for Local Dev & Testing)

```powershell
# 1. Create database, tables, constraints, indexes & views
sqlcmd -S ".\SQLEXPRESS" -E -C -i database/schema.sql

# 2. Populate official seed data (24 schedules, 20 rooms, 7 events, 8 announcements, 8 assignments)
sqlcmd -S ".\SQLEXPRESS" -E -C -i database/seed.sql

# 3. Create stored procedures for room booking, conflict detection & event registration
sqlcmd -S ".\SQLEXPRESS" -E -C -i database/procedures.sql

# 4. Run the automated 14-test verification suite
sqlcmd -S ".\SQLEXPRESS" -E -C -i database/verify.sql
```

### Option B: Using Python Runner

```powershell
# Re-generate seed.sql and apply directly to SQL Server in one step:
py database/seed_from_json.py --apply
```

### Option C: Using SQL Server Management Studio (SSMS) or Azure Data Studio
Open each script in order (`schema.sql` → `seed.sql` → `procedures.sql` → `verify.sql`) and press `F5` (Execute).

---

## 5. Integration Contract for FastAPI / Backend

The backend (FastAPI / SQLAlchemy / pyodbc) reads from and writes to this database as the **single source of truth**.

### Connection Details

- **Database Name**: `CampusOS`
- **Default Local Instance**: `localhost\SQLEXPRESS` or `.\SQLEXPRESS`
- **Auth**: Windows Authentication (Trusted Connection) or SQL Authentication (`sa`)

#### `.env` Example Connection Strings:
```ini
# pyodbc with Windows Auth (ODBC Driver 18)
DATABASE_URL=mssql+pyodbc://localhost\SQLEXPRESS/CampusOS?driver=ODBC+Driver+18+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes

# pymssql
DATABASE_URL=mssql+pymssql://user:password@localhost/CampusOS
```

### Data Type Mappings

| SQL Server Type | Python / Pydantic Type | JSON Wire Format | Notes |
|---|---|---|---|
| `VARCHAR(50)` | `str` | `"sch-001"` | Stable IDs |
| `DATE` | `datetime.date` | `"2026-09-07"` | ISO 8601 string |
| `TIME(0)` | `datetime.time` | `"13:00"` | 24-hour `"HH:MM"` format |
| `NVARCHAR(500)` (equipment) | `list[str]` | `["whiteboard", "projector"]` | Stored as valid JSON string |
| `INT` | `int` | `40` | Integer numbers |

### Core Backend Stored Procedures

#### 1. Check Room Availability: `dbo.sp_CheckRoomAvailability`
Verifies if a room is available on a specific date and time window against BOTH confirmed bookings and regular recurring class timetables.
```sql
EXEC dbo.sp_CheckRoomAvailability 
    @RoomIdentifier = '7A02', 
    @Date = '2026-09-05', 
    @StartTime = '15:00', 
    @EndTime = '17:00',
    @IsAvailable = @is_avail OUTPUT,
    @ConflictReason = @conflict OUTPUT;
```

#### 2. Find Available Rooms: `dbo.sp_FindAvailableRooms`
Finds rooms meeting capacity, type, and equipment requirements that are free during a date/time window:
```sql
EXEC dbo.sp_FindAvailableRooms
    @Date = '2026-09-05',
    @StartTime = '14:00',
    @EndTime = '16:00',
    @MinCapacity = 5,
    @RoomType = NULL,
    @RequiredEquipment = 'projector';
```

#### 3. Book Room: `dbo.sp_BookRoom`
Safely attempts to book a room inside an atomic transaction, checking for schedule/booking conflicts before inserting:
```sql
EXEC dbo.sp_BookRoom
    @RoomIdentifier = '7A02',
    @BookedBy = 'Sakibul Hassan',
    @Date = '2026-09-05',
    @StartTime = '15:00',
    @EndTime = '17:00',
    @Purpose = 'Hackathon Practice',
    @BookingId = NULL; -- Auto-generates 'bk-XXX'
```

#### 4. Cancel Booking: `dbo.sp_CancelRoomBooking`
Marks booking as `cancelled`, immediately freeing the room for new bookings:
```sql
EXEC dbo.sp_CancelRoomBooking @BookingId = 'bk-001';
```

#### 5. Register For Event: `dbo.sp_RegisterForEvent`
Safely registers a student inside an atomic transaction. Enforces capacity limits, prevents duplicate registrations, and marks event status as `'full'` when capacity is reached:
```sql
EXEC dbo.sp_RegisterForEvent
    @EventId = 'evt-001',
    @StudentId = '20-40532',
    @Name = 'Sakibul Hassan';
```

#### 6. Cancel Event Registration: `dbo.sp_CancelEventRegistration`
Cancels registration and decrements `registered` count:
```sql
EXEC dbo.sp_CancelEventRegistration
    @EventId = 'evt-001',
    @StudentId = '20-40532';
```

---

## 6. Verification Status

All 14 checklist criteria have been verified directly against local SQL Server 2025:
- [x] All 7 required tables exist
- [x] Primary keys enforced (duplicate insertion rejected)
- [x] Foreign keys enforced (invalid reference rejected)
- [x] Seed data inserted and row counts verified against official JSONs
- [x] Room booking records can be created
- [x] Overlapping bookings detected and blocked
- [x] Booking cancellation tested and verified
- [x] Event registration records can be created
- [x] Event registration cancellation tested and verified
- [x] Event capacity dynamically calculated via view and procedure
- [x] Schedule queries verified
- [x] Assignment queries verified
- [x] Announcement queries verified
- [x] Room filtering by equipment, type, and capacity verified
