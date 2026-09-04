# CampusOS — Backend & AI Agent Engine

Welcome to the **CampusOS Backend & AI Agent Engine**. This service provides a robust, high-performance **FastAPI REST API** connecting directly to Microsoft SQL Server (`CampusOS`) as the single source of truth, alongside an intelligent **AI Agent powered by Google Gemini with native tool calling**.

---

## 1. Directory Structure

```
backend/
├── main.py                 # FastAPI application, CORS middleware & error handling
├── config.py               # Environment configuration (.env loader)
├── database.py             # SQLAlchemy engine & session dependency
├── models.py               # SQLAlchemy ORM models matching CampusOS tables
├── schemas.py              # Pydantic request & response schemas
├── routers/
│   ├── schedules.py        # /api/schedules CRUD & filters
│   ├── rooms.py            # /api/rooms CRUD & actions (/book, /cancel-booking)
│   ├── events.py           # /api/events CRUD & actions (/register, /cancel-registration)
│   ├── announcements.py    # /api/announcements CRUD & priority filters
│   ├── assignments.py      # /api/assignments CRUD & deadline filters
│   └── chat.py             # /api/chat AI agent endpoint
├── services/
│   ├── db_service.py       # Transactional room booking & event registration logic
│   └── agent_service.py    # Gemini tool calling engine & function declarations
├── test_backend.py         # Automated test suite for all endpoints & tools
├── requirements.txt        # Python dependencies
└── README.md               # This documentation
```

---

## 2. API Endpoints Reference

Interactive Swagger documentation is available at:
`http://localhost:8000/docs`

### Schedules (`/api/schedules`)
- `GET /api/schedules` — List schedules (filters: `?day=Wednesday`, `?course=CSE 4113`)
- `GET /api/schedules/{id}` — Get single schedule
- `POST /api/schedules` — Add class (persists to SQL Server)
- `PUT /api/schedules/{id}` — Update class details
- `DELETE /api/schedules/{id}` — Delete class

### Rooms & Room Bookings (`/api/rooms`)
- `GET /api/rooms` — List rooms (filters: `?type=lab`, `?min_capacity=30`, `?equipment=projector`)
- `GET /api/rooms/{id}` — Get single room with active bookings
- `POST /api/rooms` — Add room
- `PUT /api/rooms/{id}` — Update room capacity, equipment, status
- `DELETE /api/rooms/{id}` — Delete room
- `POST /api/rooms/book` — **Book Room Action**
  - Payload: `{ "room_identifier": "7A02", "booked_by": "Name", "date": "2026-09-05", "start_time": "15:00", "end_time": "17:00", "purpose": "Meeting" }`
  - Rejects conflicts with `HTTP 409 Conflict` (checks both bookings and class timetable schedules)
- `POST /api/rooms/cancel-booking` — **Cancel Booking Action**
  - Payload: `{ "booking_id": "bk-001" }`

### Events & Registrations (`/api/events`)
- `GET /api/events` — List events (filters: `?date=YYYY-MM-DD`, `?status=upcoming`)
- `GET /api/events/{id}` — Get single event with registrations and remaining capacity
- `POST /api/events` — Add event
- `PUT /api/events/{id}` — Update event details
- `DELETE /api/events/{id}` — Delete event
- `POST /api/events/register` — **Register Student Action**
  - Payload: `{ "event_id": "evt-001", "student_id": "20-40532", "name": "Sakibul Hassan" }`
  - Prevents duplicate registration (`409 Conflict`), enforces capacity limits, and marks `'full'` when cap is reached
- `POST /api/events/cancel-registration` — **Cancel Registration Action**
  - Payload: `{ "event_id": "evt-001", "student_id": "20-40532" }`
  - Decrements registered count and restores `'upcoming'` status

### Announcements (`/api/announcements`)
- `GET /api/announcements` — List notices (filters: `?priority=high`, `?active_only=true`)
- `GET /api/announcements/{id}` — Get notice
- `POST /api/announcements` — Add notice
- `PUT /api/announcements/{id}` — Edit notice
- `DELETE /api/announcements/{id}` — Delete notice

### Assignments (`/api/assignments`)
- `GET /api/assignments` — List assignments (filters: `?course=CSE 4113`, `?status=pending`, `?deadline=YYYY-MM-DD`)
- `GET /api/assignments/{id}` — Get assignment
- `POST /api/assignments` — Add assignment
- `PUT /api/assignments/{id}` — Edit assignment
- `DELETE /api/assignments/{id}` — Delete assignment

### AI Agent Chat (`POST /api/chat`)
- Payload:
  ```json
  {
    "message": "Book Room 7A02 tomorrow from 3 PM to 5 PM",
    "conversation_history": []
  }
  ```
- Response:
  ```json
  {
    "reply": "Room 7A02 has been successfully booked for tomorrow from 3:00 PM to 5:00 PM.",
    "tools_called": [
      {
        "tool": "book_room",
        "arguments": {
          "room_number": "7A02",
          "booked_by": "Sakibul Hassan",
          "date": "2026-09-05",
          "start_time": "15:00",
          "end_time": "17:00",
          "purpose": "Study Session"
        },
        "result": { "success": true, "booking_id": "bk-004" }
      }
    ]
  }
  ```

---

## 3. Gemini AI Agent Tools

The AI Agent utilizes **native Gemini Function/Tool Calling** (`google-genai`). The registered tools are:

1. `get_schedules(day, course)` — Queries class schedules
2. `find_available_rooms(date, start_time, end_time, min_capacity, equipment)` — Searches vacant rooms
3. `book_room(room_number, booked_by, date, start_time, end_time, purpose)` — Creates room booking
4. `cancel_room_booking(booking_id)` — Cancels room reservation
5. `get_events(date, status)` — Searches campus events and capacity
6. `register_for_event(event_id, student_id, student_name)` — Registers student for event
7. `cancel_event_registration(event_id, student_id)` — Cancels student registration
8. `get_announcements(priority, active_only)` — Retrieves notices
9. `get_assignments(course, status, due_this_week)` — Retrieves assignments and deadlines

---

## 4. How to Run the Backend

### Prerequisites
1. Microsoft SQL Server is running locally with the `CampusOS` database seeded (`sqlcmd -S ".\SQLEXPRESS" -E -C -i database/seed.sql`).
2. Python 3.12+ installed.

### Setup & Run
```bash
# 1. Install dependencies
py -m pip install -r backend/requirements.txt

# 2. Configure .env
# Ensure .env exists in the project root with DATABASE_URL and GEMINI_API_KEY:
# DATABASE_URL=mssql+pyodbc://localhost\SQLEXPRESS/CampusOS?driver=ODBC+Driver+18+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes
# GEMINI_API_KEY=your_gemini_api_key_here

# 3. Start the FastAPI server
py -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Running Automated Verification Tests
```bash
py backend/test_backend.py
```
