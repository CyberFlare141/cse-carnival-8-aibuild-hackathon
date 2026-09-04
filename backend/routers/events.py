from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date

from backend.database import get_db
from backend.models import Event, EventRegistration
from backend.schemas import (
    EventCreate, EventUpdate, EventResponse,
    EventRegistrationCreate, EventRegistrationCancel
)
from backend.services import db_service
from backend.services.db_service import parse_date, parse_time

router = APIRouter(prefix="/events", tags=["Events"])


def split_time_range(value: str) -> tuple[str, str]:
    """Convert the dashboard's ``HH:MM - HH:MM`` value to API time fields."""
    parts = value.split("-", maxsplit=1)
    if len(parts) != 2 or not parts[0].strip() or not parts[1].strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="time must use the format 'HH:MM - HH:MM'."
        )
    return parts[0].strip(), parts[1].strip()

@router.get("", response_model=list[EventResponse])
def get_events(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    status: Optional[str] = Query(None, description="Filter by status (upcoming, full, completed, etc.)"),
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    if date:
        d = parse_date(date)
        query = query.filter(Event.date == d)
    if status:
        query = query.filter(Event.status == status.lower())
    return query.order_by(Event.date, Event.start_time).all()

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event '{event_id}' not found."
        )
    return event

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(event_in: EventCreate, db: Session = Depends(get_db)):
    # Generate ID if missing
    ev_id = event_in.id
    if not ev_id:
        existing_ids = db.query(Event.id).all()
        nums = []
        for (i,) in existing_ids:
            if i.startswith("evt-"):
                try:
                    nums.append(int(i[4:]))
                except ValueError:
                    pass
        next_num = (max(nums) + 1) if nums else 1
        ev_id = f"evt-{next_num:03d}"

    edate = parse_date(event_in.date)
    if edate < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event date cannot be in the past.")
    # A single-day event defaults its end date to its start date, as specified
    # by the data schema.  Avoid passing None into the date parser when the
    # frontend omits the optional field.
    end_date = parse_date(event_in.end_date or event_in.date)
    if event_in.time:
        start_value, end_value = split_time_range(event_in.time)
    else:
        start_value, end_value = event_in.start_time, event_in.end_time
    st = parse_time(start_value)
    et = parse_time(end_value)
    db_service.ensure_start_is_current_or_future(
        edate, st, "Event start time cannot be in the past."
    )

    if st >= et:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time must be earlier than end_time."
        )
    if event_in.capacity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="capacity cannot be negative."
        )
    if event_in.capacity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="capacity must be greater than zero.")

    if event_in.venue:
        db.execute(
            db_service.text("SELECT id FROM dbo.Rooms WITH (UPDLOCK, HOLDLOCK) WHERE id = :venue OR room_number = :venue"),
            {"venue": event_in.venue}
        )
        available, reason, _ = db_service.check_venue_availability(db, event_in.venue, edate, st, et)
        if not available:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=reason)

    new_event = Event(
        id=ev_id,
        name=event_in.name,
        description=event_in.description,
        date=edate,
        start_time=st,
        end_time=et,
        end_date=end_date,
        venue=event_in.venue,
        organizer=event_in.organizer,
        capacity=event_in.capacity,
        registered=event_in.registered or 0,
        status=event_in.status
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

@router.put("/{event_id}", response_model=EventResponse)
def update_event(event_id: str, event_in: EventUpdate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event '{event_id}' not found."
        )

    data = event_in.model_dump(exclude_unset=True)
    combined_time = data.pop("time", None)
    if combined_time and "start_time" not in data and "end_time" not in data:
        start_time, end_time = split_time_range(combined_time)
        data["start_time"] = start_time
        data["end_time"] = end_time
    if "date" in data and data["date"] is not None:
        data["date"] = parse_date(data["date"])
        if data["date"] < date.today():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event date cannot be in the past.")
    if "end_date" in data and data["end_date"] is not None:
        data["end_date"] = parse_date(data["end_date"])
    if "start_time" in data and data["start_time"] is not None:
        data["start_time"] = parse_time(data["start_time"])
    if "end_time" in data and data["end_time"] is not None:
        data["end_time"] = parse_time(data["end_time"])

    start_time = data.get("start_time", event.start_time)
    end_time = data.get("end_time", event.end_time)
    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time must be earlier than end_time."
        )
    if data.get("capacity") is not None:
        if data["capacity"] < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="capacity cannot be negative."
            )
        if data["capacity"] <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="capacity must be greater than zero.")
        if data["capacity"] < event.registered:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="capacity cannot be lower than the current registered count."
            )

    target_date = data.get("date", event.date)
    if target_date < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event date cannot be in the past.")
    db_service.ensure_start_is_current_or_future(
        target_date, start_time, "Event start time cannot be in the past."
    )
    target_venue = data.get("venue", event.venue)
    if target_venue:
        db.execute(
            db_service.text("SELECT id FROM dbo.Rooms WITH (UPDLOCK, HOLDLOCK) WHERE id = :venue OR room_number = :venue"),
            {"venue": target_venue}
        )
        available, reason, _ = db_service.check_venue_availability(
            db, target_venue, target_date, start_time, end_time, exclude_event_id=event.id
        )
        if not available:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=reason)

    for field, val in data.items():
        setattr(event, field, val)

    event.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    return event

@router.delete("/{event_id}", status_code=status.HTTP_200_OK)
def delete_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event '{event_id}' not found."
        )
    db.delete(event)
    db.commit()
    return {"message": f"Event '{event_id}' successfully deleted.", "id": event_id}

# ---------------------------------------------------------------------------
# Event Actions: Registration & Cancellation
# ---------------------------------------------------------------------------
@router.post("/register", status_code=status.HTTP_201_CREATED)
@router.post("/{event_id}/register", status_code=status.HTTP_201_CREATED)
def register_for_event_action(
    payload: EventRegistrationCreate,
    event_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    target_event = event_id or payload.event_id
    if not target_event:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="event_id is required either in URL path or request body."
        )

    st_id = payload.get_student_id()
    return db_service.register_for_event(
        db,
        event_id=target_event,
        student_id=st_id,
        student_name=payload.name
    )

@router.post("/cancel-registration", status_code=status.HTTP_200_OK)
@router.post("/{event_id}/cancel-registration", status_code=status.HTTP_200_OK)
def cancel_registration_action(
    payload: EventRegistrationCancel,
    event_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    target_event = event_id or payload.event_id
    if not target_event:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="event_id is required either in URL path or request body."
        )

    return db_service.cancel_event_registration(
        db,
        event_id=target_event,
        student_id=payload.student_id,
        name=payload.name
    )
