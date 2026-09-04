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
    room_number: Optional[str] = None
    roomNumber: Optional[str] = None
    type: str = "classroom"
    capacity: int = 40
    equipment: list[str] = []
    floor: int = 7
    status: str = "available"

    @field_validator("room_number", mode="before")
    def validate_room_number(cls, v, info):
        return v

    @field_validator("equipment", mode="before")
    def validate_equipment(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [s.strip() for s in v.split(",") if s.strip()]
        return v or []

    def get_room_number(self) -> str:
        return self.room_number or self.roomNumber or ""

class RoomCreate(RoomBase):
    id: Optional[str] = None

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    roomNumber: Optional[str] = None
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

    def get_room_number(self) -> Optional[str]:
        return self.room_number or self.roomNumber

class RoomResponse(BaseModel):
    id: str
    room_number: str
    type: str
    capacity: int
    equipment: list[str] = []
    floor: int
    status: str = "available"
    bookings: list[BookingResponse] = []

    @field_validator("equipment", mode="before")
    def validate_equipment(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [s.strip() for s in v.split(",") if s.strip()]
        return v or []

    class Config:
        from_attributes = True

class RoomBookingCreate(BaseModel):
    room_identifier: Optional[str] = None
    booked_by: Optional[str] = None
    bookedBy: Optional[str] = None
    date: str
    start_time: Optional[str] = None
    startTime: Optional[str] = None
    end_time: Optional[str] = None
    endTime: Optional[str] = None
    purpose: Optional[str] = "Academic session"

    def get_booked_by(self) -> str:
        return self.booked_by or self.bookedBy or "Student"

    def get_start_time(self) -> str:
        return format_time(self.start_time or self.startTime)

    def get_end_time(self) -> str:
        return format_time(self.end_time or self.endTime)

class RoomBookingCancel(BaseModel):
    booking_id: Optional[str] = None
    bookingId: Optional[str] = None

    def get_booking_id(self) -> str:
        return self.booking_id or self.bookingId or ""

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
    description: Optional[str] = ""
    date: str
    start_time: Optional[str] = "10:00"
    end_time: Optional[str] = "12:00"
    end_date: Optional[str] = None
    venue: str = "7A01"
    organizer: Optional[str] = "AUST"
    capacity: int = 40
    status: str = "upcoming"

    @field_validator("date", mode="before")
    def validate_date(cls, v):
        return format_date(v)

    @field_validator("end_date", mode="before")
    def validate_end_date(cls, v, info):
        if v is None and "date" in info.data:
            return format_date(info.data["date"])
        return format_date(v) if v is not None else v

    @field_validator("start_time", "end_time", mode="before")
    def validate_time(cls, v):
        if v is not None:
            return format_time(v)
        return v

class EventCreate(EventBase):
    id: Optional[str] = None
    registered: Optional[int] = 0
    time: Optional[str] = None

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    # The dashboard edits events with a combined "HH:MM - HH:MM" value.
    # Keep accepting the canonical start/end fields too.
    time: Optional[str] = None
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
    event_id: Optional[str] = None
    student_id: Optional[str] = None
    name: str

    def get_student_id(self) -> str:
        if self.student_id:
            return self.student_id
        # Fallback generated ID from name
        return f"std-{abs(hash(self.name)) % 100000:05d}"

class EventRegistrationCancel(BaseModel):
    event_id: Optional[str] = None
    student_id: Optional[str] = None
    name: Optional[str] = None


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
    assigned_date: Optional[str] = None

    @field_validator("assigned_date", mode="before")
    def validate_assigned_date(cls, v):
        if not v:
            return date.today().isoformat()
        return format_date(v)

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
    content: Optional[str] = ""
    text: Optional[str] = None

    def get_content(self) -> str:
        return self.content or self.text or ""

class ChatRequest(BaseModel):
    message: str
    conversation_history: list[ChatMessage] = []
    history: Optional[list[ChatMessage]] = None

    def get_history(self) -> list[ChatMessage]:
        return self.conversation_history or self.history or []

class ToolCallLog(BaseModel):
    tool: str
    name: Optional[str] = None
    arguments: dict[str, Any] = {}
    args: Optional[dict[str, Any]] = None
    result: Any = None

    def __init__(self, **data):
        super().__init__(**data)
        if not self.name and self.tool:
            self.name = self.tool
        if not self.args and self.arguments:
            self.args = self.arguments

class ChatResponse(BaseModel):
    reply: str
    tools_called: list[ToolCallLog] = []
    toolCalls: list[ToolCallLog] = []
    tool_calls: list[ToolCallLog] = []
