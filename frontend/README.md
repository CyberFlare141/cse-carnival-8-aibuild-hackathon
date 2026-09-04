# CampusOS Frontend

An intelligent academic bulletin and campus data registry single-page application built with **React** and **Vite**, featuring an integrated AI Agent Chat panel capable of autonomous tool-execution and cross-section live state synchronization.

---

## 1. Quickstart & Running the App

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation & Launch

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The application will be running at: **`http://localhost:5173`**.

* **`http://localhost:5173/`** — Public Landing Page (interactive agent preview, 5 campus systems showcase, and workflow explanation).
* **`http://localhost:5173/app`** — Full CampusOS Dashboard Workspace (Class Timetable, Room Registry, Events Gazette, Notice Board, Assignments Log, and AI Chat).

---

## 2. Pointing to a Different Backend URL via `.env`

The frontend talks directly to the FastAPI backend API via `fetch`. By default, it targets `http://localhost:8000/api`.

To point the frontend to a different backend URL (e.g. a remote server or a different local port):

1. Copy `.env.example` to `.env` (if not already created):
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and set `VITE_API_URL` to your desired backend API endpoint:
   ```env
   # Set your custom backend URL here:
  VITE_API_URL=http://localhost:8000/api

   # Examples for remote / staging servers:
   # VITE_API_URL=https://api.campusos.university.edu/api
   # VITE_API_URL=http://192.168.1.50:8080/api
   ```

3. Restart the Vite development server (`npm run dev`) to pick up the new environment variable.

---

## 3. Design System — Maximalism / Dopamine Design

CampusOS uses a **Maximalism / Dopamine Design** system ("Controlled Chaos", "Visually intense, but still easy to use"). Visual complexity is engineered systematically to support readability, clear hierarchy, and high engagement:

- **Dark Foundation**:
  - Deep Space Canvas: `#0D0D1A`
  - Elevated Surfaces: `#140E2B`, `#191236`, `#1F1642`
  - High Contrast Text: Pure White `#FFFFFF`, Soft Lavender `#B8A9D9`
- **Five Systematic Accent Colors (Rotated Across Sections & Cards)**:
  1. **Magenta**: `#FF3AF2`
  2. **Cyan**: `#00F5D4`
  3. **Yellow**: `#FFE600`
  4. **Orange**: `#FF6B35`
  5. **Purple**: `#7B2FFF`
- **Typography**:
  - **Headings & Badges**: `Outfit` (weights 800–900, tight tracking)
  - **Body & Data**: `DM Sans` (weights 400–700)
  - **Display / Watermarks**: `Bungee` / `Outfit` 900
  - **Codes & Room Numbers**: `SFMono-Regular`, `Consolas`, monospace
- **Text Shadows & Gradient Text**:
  - Single: `text-shadow: 2px 2px 0 #7B2FFF;`
  - Double: `text-shadow: 2px 2px 0 #7B2FFF, 4px 4px 0 #FF3AF2;`
  - Animated 4-color gradient titles (`#FF3AF2` → `#00F5D4` → `#FFE600` → `#FF3AF2`).
- **Borders & Radii**:
  - Standard 4px thick borders, 8px heavy borders, 2px dividers.
  - 24px cards, 16px containers, and full pill (`9999px`) buttons.
- **Layered Hard Shadows & Neon Glows**:
  - Retro-future hard drop shadows (`6px 6px 0 #FF3AF2, 12px 12px 0 #00F5D4`).
  - Neon glows on focus states, active buttons, and live AI agent traces.
- **Visual Signatures**:
  - Oversized background typography watermarks (`SCHEDULE`, `ROOMS`, `EVENTS`, `NOTICES`, `TASKS`, `AGENT`).
  - Systematic color rotation across consecutive cards (`accent = colors[index % colors.length]`).
  - Subtle dot-grid and diagonal-stripe CSS patterns (`pointer-events: none`).
  - Full WCAG AA contrast compliance and `prefers-reduced-motion` support.

---

## 4. Backend API Contract Supported

The frontend seamlessly connects to the Express backend specification:

### Base URL
`http://localhost:8000/api` (or `VITE_API_URL`)

### CRUD Resources
Each resource supports `GET /:resource`, `POST /:resource`, `PUT /:resource/:id`, and `DELETE /:resource/:id`:

1. **Schedule** (`/schedule`):
   - `{ id, course, day, time, room, instructor }`
2. **Rooms** (`/rooms`):
   - `{ id, roomNumber, capacity, equipment: string[], bookings: [{id, date, startTime, endTime, bookedBy}] }`
3. **Events** (`/events`):
   - `{ id, name, date, time, capacity, registered, registrants: string[] }`
4. **Announcements** (`/announcements`):
   - `{ id, title, body, date, priority }`
5. **Assignments** (`/assignments`):
   - `{ id, course, title, deadline, status }`

### Extra Action Endpoints
- `POST /rooms/:id/book` — `{ date, startTime, endTime, bookedBy }`
- `POST /rooms/:id/cancel-booking` — `{ bookingId }`
- `POST /events/:id/register` — `{ name }`
- `POST /events/:id/cancel-registration` — `{ name }`

### Agent Chat Endpoint
- `POST /agent/chat` — `{ message, history }` → `{ reply, toolCalls: [{name, args, result}] }`

> **Note on Compatibility**: The API client normalizer automatically bridges camelCase (`roomNumber`, `startTime`, `bookedBy`, `registrants`) and snake_case (`room_number`, `start_time`, `booked_by`, `registrations`) in both directions.

---

## 5. Agent Chat & Tool Execution Traces

The **Chat with CampusOS** panel provides:
- Conversation history between the student and the AI agent.
- **Human-Readable Tool Traces**: When the agent returns `toolCalls`, CampusOS formats them into compact, meaningful action badges (e.g. `✦ Action: Booked Room 7A02, 2026-09-08 (15:00–17:00) for Farhan` or `✦ Action: Registered Farhan Ahmed for AI Build Hackathon`) above the message instead of displaying raw, unformatted JSON.
- **Real-Time Cross-Section Synchronization**: Whenever the agent performs an action modifying campus data, all relevant dashboard sections (and item counters) update immediately in the background without requiring the user to reload.
- Quick prompt buttons for common student requests (e.g. checking next class, urgent deadlines, booking rooms).

---

## 6. Optional Standalone Mock API (For Review & Testing)

If you wish to test the frontend before running your full Express server, a zero-dependency mock verification server is included:

```bash
# Starts mock server on http://localhost:4000/api loading ../data/*.json
npm run mock-api
```

You can then run `npm run dev` in another terminal to interact with live seed data, test bookings, registrations, and agent chat immediately.

---

## 7. Build for Production

```bash
npm run build
```

Generates an optimized, minified bundle in `frontend/dist/`.
