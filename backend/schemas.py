from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from datetime import date, time
import json

# ---------------------------------------------------------------------------
# Helper formatting functions
# ---------------------------------------------------------------------------
def format_time(v: Any) -> str:
    if isinstance(v, time):
        return v.strftime("%H:%M")
    if isinstance(v, str):
        # normalize HH:MM:SS to HH:MM
        parts = v.split(":")
        if len(parts) >= 2:
            return f"{int(parts[0]):02d}:{int(parts[1]):02d}"
    return str(v)

def format_date(v: Any) -> str:
    if isinstance(v, date):
        return v.isoformat()
    return str(v)

# ---------------------------------------------------------------------------
# 1. Schedules
# ---------------------------------------------------------------------------
class ScheduleBase(BaseModel):
    course: str
    title: str
    day: str
    start_time: str
    end_time: str
    room: str
    instructor: str
    section: str

    @field_validator("start_time", "end_time", mode="before")
    def validate_time(cls, v):
        return format_time(v)

class ScheduleCreate(ScheduleBase):
    id: Optional[str] = None

class ScheduleUpdate(BaseModel):
    course: Optional[str] = None
    title: Optional[str] = None
    day: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None
    instructor: Optional[str] = None
    section: Optional[str] = None

    @field_validator("start_time", "end_time", mode="before")
    def validate_time(cls, v):
        if v is not None:
            return format_time(v)
        return v

class ScheduleResponse(ScheduleBase):
    id: str

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# 2. Rooms & Room Bookings
# ---------------------------------------------------------------------------
class BookingResponse(BaseModel):
    booking_id: str
    booked_by: str
    date: str
    start_time: str
    end_time: str
    purpose: str
    status: Optional[str] = "confirmed"

    @field_validator("date", mode="before")
    def validate_date(cls, v):
        return format_date(v)

    @field_validator("start_time", "end_time", mode="before")
    def validate_time(cls, v):
        return format_time(v)

    class Config:
        from_attributes = True

class RoomBase(BaseModel):
    room_number: str
    type: str
    capacity: int
    equipment: list[str] = []
    floor: int
    status: str = "available"

    @field_validator("equipment", mode="before")
    def validate_equipment(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [s.strip() for s in v.split(",") if s.strip()]
        return v or []

class RoomCreate(RoomBase):
    id: Optional[str] = None

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    type: Optional[str] = None
    capacity: Optional[int] = None
    equipment: Optional[list[str]] = None
    floor: Optional[int] = None
    status: Optional[str] = None

    @field_validator("equipment", mode="before")
    def validate_equipment(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [s.strip() for s in v.split(",") if s.strip()]
        return v

class RoomResponse(RoomBase):
    id: str
    bookings: list[BookingResponse] = []

    class Config:
        from_attributes = True

class RoomBookingCreate(BaseModel):
    room_identifier: str = Field(..., description="Room ID (e.g. room-002) or Room Number (e.g. 7A02)")
    booked_by: str
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    start_time: str = Field(..., description="24h time in HH:MM format")
    end_time: str = Field(..., description="24h time in HH:MM format")
    purpose: str

    @field_validator("start_time", "end_time", mode="before")
    def validate_time(cls, v):
        return format_time(v)

class RoomBookingCancel(BaseModel):
    booking_id: str

# ---------------------------------------------------------------------------
# 3. Events & Event Registrations
# ---------------------------------------------------------------------------
class RegistrationResponse(BaseModel):
    student_id: str
    name: str

    class Config:
        from_attributes = True

class EventBase(BaseModel):
    name: str
    description: str
    date: str
    start_time: str
    end_time: str
    end_date: str
    venue: str
    organizer: str
    capacity: int
    status: str = "upcoming"

    @field_validator("date", "end_date", mode="before")
    def validate_date(cls, v):
        return format_date(v)

    @field_validator("start_time", "end_time", mode="before")
    def validate_time(cls, v):
        return format_time(v)

class EventCreate(EventBase):
    id: Optional[str] = None
    registered: Optional[int] = 0

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    end_date: Optional[str] = None
    venue: Optional[str] = None
    organizer: Optional[str] = None
    capacity: Optional[int] = None
    registered: Optional[int] = None
    status: Optional[str] = None

    @field_validator("date", "end_date", mode="before")
    def validate_date(cls, v):
        if v is not None:
            return format_date(v)
        return v

    @field_validator("start_time", "end_time", mode="before")
    def validate_time(cls, v):
        if v is not None:
            return format_time(v)
        return v

class EventResponse(EventBase):
    id: str
    registered: int
    registrations: list[RegistrationResponse] = []

    class Config:
        from_attributes = True

class EventRegistrationCreate(BaseModel):
    event_id: str
    student_id: str
    name: str

class EventRegistrationCancel(BaseModel):
    event_id: str
    student_id: str

# ---------------------------------------------------------------------------
# 4. Announcements
# ---------------------------------------------------------------------------
class AnnouncementBase(BaseModel):
    title: str
    body: str
    date: str
    priority: str
    posted_by: str
    expires: str

    @field_validator("date", "expires", mode="before")
    def validate_date(cls, v):
        return format_date(v)

class AnnouncementCreate(AnnouncementBase):
    id: Optional[str] = None

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    date: Optional[str] = None
    priority: Optional[str] = None
    posted_by: Optional[str] = None
    expires: Optional[str] = None

    @field_validator("date", "expires", mode="before")
    def validate_date(cls, v):
        if v is not None:
            return format_date(v)
        return v

class AnnouncementResponse(AnnouncementBase):
    id: str

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# 5. Assignments
# ---------------------------------------------------------------------------
class AssignmentBase(BaseModel):
    course: str
    course_title: str
    title: str
    description: str
    assigned_date: str
    deadline: str
    submission_platform: str
    status: str = "pending"
    marks: int = 0

    @field_validator("assigned_date", "deadline", mode="before")
    def validate_date(cls, v):
        return format_date(v)

class AssignmentCreate(AssignmentBase):
    id: Optional[str] = None

class AssignmentUpdate(BaseModel):
    course: Optional[str] = None
    course_title: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_date: Optional[str] = None
    deadline: Optional[str] = None
    submission_platform: Optional[str] = None
    status: Optional[str] = None
    marks: Optional[int] = None

    @field_validator("assigned_date", "deadline", mode="before")
    def validate_date(cls, v):
        if v is not None:
            return format_date(v)
        return v

class AssignmentResponse(AssignmentBase):
    id: str

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# 6. Chat & AI Agent
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str # "user" or "assistant" or "system"
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: list[ChatMessage] = []

class ToolCallLog(BaseModel):
    tool: str
    arguments: dict[str, Any]
    result: Any

class ChatResponse(BaseModel):
    reply: str
    tools_called: list[ToolCallLog] = []
