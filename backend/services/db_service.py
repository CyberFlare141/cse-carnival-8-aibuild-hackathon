from datetime import datetime, date, time, timedelta
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_
from fastapi import HTTPException, status
import json
import calendar

from backend.models import (
    Schedule, Room, RoomBooking, Event, EventRegistration,
    Announcement, Assignment
)

def parse_time(t_str: str) -> time:
    """Parses 'HH:MM' string to time object."""
    if isinstance(t_str, time):
        return t_str
    parts = t_str.strip().split(":")
    return time(int(parts[0]), int(parts[1]))

def parse_date(d_str: str) -> date:
    """Parses 'YYYY-MM-DD' string to date object."""
    if isinstance(d_str, date):
        return d_str
    return datetime.strptime(d_str.strip(), "%Y-%m-%d").date()

def format_time_str(t: time) -> str:
    return t.strftime("%H:%M")

def format_date_str(d: date) -> str:
    return d.strftime("%Y-%m-%d")

# ---------------------------------------------------------------------------
# Room Operations
# ---------------------------------------------------------------------------
def check_room_availability(
    db: Session,
    room_identifier: str,
    target_date: date,
    start_time: time,
    end_time: time
) -> tuple[bool, Optional[str], Optional[Room]]:
    """
    Checks if a room is available for the given date and time window.
    Checks against both confirmed RoomBookings and regular class Schedules.
    """
    # 1. Resolve room
    room = db.query(Room).filter(
        or_(Room.id == room_identifier, Room.room_number == room_identifier)
    ).first()

    if not room:
        return False, f"Room '{room_identifier}' not found.", None

    if room.status != "available":
        return False, f"Room {room.room_number} is marked as '{room.status}'.", room

    # 2. Check overlapping confirmed bookings on target_date
    overlapping_booking = db.query(RoomBooking).filter(
        RoomBooking.room_id == room.id,
        RoomBooking.date == target_date,
        RoomBooking.status == "confirmed",
        RoomBooking.start_time < end_time,
        RoomBooking.end_time > start_time
    ).first()

    if overlapping_booking:
        b_start = format_time_str(overlapping_booking.start_time)
        b_end = format_time_str(overlapping_booking.end_time)
        return False, f"Room {room.room_number} is already booked by {overlapping_booking.booked_by} ({overlapping_booking.purpose}) from {b_start} to {b_end}.", room

    # 3. Check class schedules for the day of week
    day_of_week = target_date.strftime("%A") # e.g. Sunday, Monday...
    overlapping_schedule = db.query(Schedule).filter(
        Schedule.room == room.room_number,
        Schedule.day == day_of_week,
        Schedule.start_time < end_time,
        Schedule.end_time > start_time
    ).first()

    if overlapping_schedule:
        s_start = format_time_str(overlapping_schedule.start_time)
        s_end = format_time_str(overlapping_schedule.end_time)
        return False, f"Room {room.room_number} has a scheduled class: {overlapping_schedule.course} ({overlapping_schedule.title}) from {s_start} to {s_end} on {day_of_week}.", room

    return True, None, room

def book_room(
    db: Session,
    room_identifier: str,
    booked_by: str,
    target_date: date,
    start_time: time,
    end_time: time,
    purpose: str,
    booking_id: Optional[str] = None
) -> RoomBooking:
    """
    Safely creates a room booking if no conflicts exist.
    """
    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time must be earlier than end_time."
        )

    # Serialize requests for the same room.  SQL Server retains this update
    # lock until the session commits, preventing two API requests from both
    # passing the availability check before either inserts its booking.
    db.execute(
        text("SELECT id FROM dbo.Rooms WITH (UPDLOCK, HOLDLOCK) "
             "WHERE id = :room_identifier OR room_number = :room_identifier"),
        {"room_identifier": room_identifier}
    )

    is_avail, conflict_reason, room = check_room_availability(
        db, room_identifier, target_date, start_time, end_time
    )

    if not is_avail:
        if room is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=conflict_reason
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=conflict_reason
        )

    if not booking_id:
        # Generate new booking ID: bk-XXX
        max_bk = db.query(RoomBooking.booking_id).all()
        nums = []
        for (b_id,) in max_bk:
            if b_id.startswith("bk-"):
                try:
                    nums.append(int(b_id[3:]))
                except ValueError:
                    pass
        next_num = (max(nums) + 1) if nums else 1
        booking_id = f"bk-{next_num:03d}"

    new_booking = RoomBooking(
        booking_id=booking_id,
        room_id=room.id,
        booked_by=booked_by,
        date=target_date,
        start_time=start_time,
        end_time=end_time,
        purpose=purpose,
        status="confirmed"
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking

def cancel_room_booking(db: Session, booking_id: str) -> dict:
    """
    Cancels a room booking by setting status to 'cancelled'.
    """
    booking = db.query(RoomBooking).filter(RoomBooking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID '{booking_id}' not found."
        )

    booking.status = "cancelled"
    booking.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Booking '{booking_id}' successfully cancelled.", "booking_id": booking_id, "status": "cancelled"}

def find_available_rooms(
    db: Session,
    target_date: date,
    start_time: time,
    end_time: time,
    min_capacity: Optional[int] = None,
    equipment: Optional[str] = None,
    room_type: Optional[str] = None
) -> list[dict]:
    """
    Finds all rooms matching criteria that are free on the given date and time window.
    """
    query = db.query(Room).filter(Room.status == "available")

    if min_capacity is not None:
        query = query.filter(Room.capacity >= min_capacity)

    if room_type:
        query = query.filter(Room.type == room_type.lower())

    rooms = query.all()
    available_rooms = []

    day_of_week = target_date.strftime("%A")

    for room in rooms:
        # Check equipment inside JSON array string
        if equipment:
            try:
                eq_list = json.loads(room.equipment)
                eq_list_lower = [x.lower() for x in eq_list]
                if equipment.lower() not in eq_list_lower:
                    continue
            except Exception:
                if equipment.lower() not in room.equipment.lower():
                    continue

        # Check booking conflict
        conflict_booking = db.query(RoomBooking).filter(
            RoomBooking.room_id == room.id,
            RoomBooking.date == target_date,
            RoomBooking.status == "confirmed",
            RoomBooking.start_time < end_time,
            RoomBooking.end_time > start_time
        ).first()
        if conflict_booking:
            continue

        # Check schedule conflict
        conflict_schedule = db.query(Schedule).filter(
            Schedule.room == room.room_number,
            Schedule.day == day_of_week,
            Schedule.start_time < end_time,
            Schedule.end_time > start_time
        ).first()
        if conflict_schedule:
            continue

        try:
            eq_parsed = json.loads(room.equipment)
        except Exception:
            eq_parsed = []

        available_rooms.append({
            "id": room.id,
            "room_number": room.room_number,
            "type": room.type,
            "capacity": room.capacity,
            "equipment": eq_parsed,
            "floor": room.floor,
            "status": room.status
        })

    # Sort by capacity ASC
    available_rooms.sort(key=lambda x: x["capacity"])
    return available_rooms

# ---------------------------------------------------------------------------
# Event Operations
# ---------------------------------------------------------------------------
def register_for_event(
    db: Session,
    event_id: str,
    student_id: str,
    student_name: str
) -> dict:
    """
    Registers a student for an event, enforcing capacity and checking duplicate registrations.
    """
    # Lock the event row for the whole check-and-insert operation so capacity
    # cannot be oversubscribed by concurrent registrations.
    db.execute(
        text("SELECT id FROM dbo.Events WITH (UPDLOCK, HOLDLOCK) WHERE id = :event_id"),
        {"event_id": event_id}
    )
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event '{event_id}' not found."
        )

    if event.status in ("cancelled", "completed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event '{event.name}' is {event.status} and cannot accept registrations."
        )

    # Check existing registration
    existing = db.query(EventRegistration).filter(
        EventRegistration.event_id == event.id,
        EventRegistration.student_id == student_id,
        EventRegistration.status == "confirmed"
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student '{student_id}' is already registered for '{event.name}'."
        )

    # Check capacity
    if event.registered >= event.capacity:
        event.status = "full"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event '{event.name}' is full (Capacity: {event.capacity})."
        )

    # Add registration
    reg = EventRegistration(
        event_id=event.id,
        student_id=student_id,
        name=student_name,
        status="confirmed"
    )
    db.add(reg)

    event.registered += 1
    if event.registered >= event.capacity:
        event.status = "full"
    event.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(reg)

    return {
        "message": f"Successfully registered for '{event.name}'.",
        "registration_id": reg.registration_id,
        "event_id": event.id,
        "student_id": student_id,
        "student_name": student_name,
        "remaining_capacity": max(0, event.capacity - event.registered)
    }

def cancel_event_registration(
    db: Session,
    event_id: str,
    student_id: Optional[str] = None,
    name: Optional[str] = None
) -> dict:
    """
    Cancels a student's event registration by student_id or name and adjusts the registered count.
    """
    query = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.status == "confirmed"
    )

    if student_id:
        query = query.filter(EventRegistration.student_id == student_id)
    elif name:
        query = query.filter(EventRegistration.name.ilike(name.strip()))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_id or name is required to cancel registration."
        )

    reg = query.first()

    if not reg:
        target = student_id or name
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active registration found for '{target}' in event '{event_id}'."
        )

    st_id = reg.student_id
    event = db.query(Event).filter(Event.id == event_id).first()

    db.delete(reg)

    if event:
        event.registered = max(0, event.registered - 1)
        if event.status == "full" and event.registered < event.capacity:
            event.status = "upcoming"
        event.updated_at = datetime.utcnow()

    db.commit()

    return {
        "message": f"Registration for '{st_id}' in event '{event_id}' successfully cancelled.",
        "event_id": event_id,
        "student_id": st_id,
        "registered_count": event.registered if event else 0
    }


# ---------------------------------------------------------------------------
# Query Helpers for AI Tools
# ---------------------------------------------------------------------------
def query_schedules(
    db: Session,
    day: Optional[str] = None,
    course: Optional[str] = None
) -> list[dict]:
    query = db.query(Schedule)
    if day:
        query = query.filter(Schedule.day.ilike(day.strip()))
    if course:
        query = query.filter(
            or_(Schedule.course.ilike(f"%{course.strip()}%"), Schedule.title.ilike(f"%{course.strip()}%"))
        )

    results = query.order_by(Schedule.start_time).all()
    return [
        {
            "id": s.id,
            "course": s.course,
            "title": s.title,
            "day": s.day,
            "start_time": format_time_str(s.start_time),
            "end_time": format_time_str(s.end_time),
            "room": s.room,
            "instructor": s.instructor,
            "section": s.section
        }
        for s in results
    ]

def query_events(
    db: Session,
    target_date: Optional[str] = None,
    status_filter: Optional[str] = None
) -> list[dict]:
    query = db.query(Event)
    if target_date:
        d = parse_date(target_date)
        query = query.filter(Event.date == d)
    if status_filter:
        query = query.filter(Event.status == status_filter.lower())

    results = query.order_by(Event.date, Event.start_time).all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "date": format_date_str(e.date),
            "start_time": format_time_str(e.start_time),
            "end_time": format_time_str(e.end_time),
            "end_date": format_date_str(e.end_date),
            "venue": e.venue,
            "organizer": e.organizer,
            "capacity": e.capacity,
            "registered": e.registered,
            "remaining_seats": max(0, e.capacity - e.registered),
            "status": e.status
        }
        for e in results
    ]

def query_announcements(
    db: Session,
    priority: Optional[str] = None,
    active_only: bool = True
) -> list[dict]:
    query = db.query(Announcement)
    if priority:
        query = query.filter(Announcement.priority == priority.lower())
    if active_only:
        today = date.today()
        query = query.filter(Announcement.expires >= today)

    results = query.order_by(Announcement.date.desc()).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "body": a.body,
            "date": format_date_str(a.date),
            "priority": a.priority,
            "posted_by": a.posted_by,
            "expires": format_date_str(a.expires)
        }
        for a in results
    ]

def query_assignments(
    db: Session,
    course: Optional[str] = None,
    status_filter: Optional[str] = None,
    due_this_week: bool = False
) -> list[dict]:
    query = db.query(Assignment)
    if course:
        query = query.filter(
            or_(Assignment.course.ilike(f"%{course.strip()}%"), Assignment.course_title.ilike(f"%{course.strip()}%"))
        )
    if status_filter:
        query = query.filter(Assignment.status == status_filter.lower())
    if due_this_week:
        today = date.today()
        # Reference date from problem seed data: 2026-09-04 to 2026-09-12 or next 7 days
        # We consider assignments due between today and today + 7 days
        next_week = today + timedelta(days=7)
        query = query.filter(Assignment.deadline >= today, Assignment.deadline <= next_week)

    results = query.order_by(Assignment.deadline).all()
    return [
        {
            "id": a.id,
            "course": a.course,
            "course_title": a.course_title,
            "title": a.title,
            "description": a.description,
            "assigned_date": format_date_str(a.assigned_date),
            "deadline": format_date_str(a.deadline),
            "submission_platform": a.submission_platform,
            "status": a.status,
            "marks": a.marks
        }
        for a in results
    ]
