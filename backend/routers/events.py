from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from backend.database import get_db
from backend.models import Event, EventRegistration
from backend.schemas import (
    EventCreate, EventUpdate, EventResponse,
    EventRegistrationCreate, EventRegistrationCancel
)
from backend.services import db_service
from backend.services.db_service import parse_date, parse_time

router = APIRouter(prefix="/events", tags=["Events"])

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
    end_date = parse_date(event_in.end_date)
    st = parse_time(event_in.start_time)
    et = parse_time(event_in.end_time)

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
    if "date" in data and data["date"] is not None:
        data["date"] = parse_date(data["date"])
    if "end_date" in data and data["end_date"] is not None:
        data["end_date"] = parse_date(data["end_date"])
    if "start_time" in data and data["start_time"] is not None:
        data["start_time"] = parse_time(data["start_time"])
    if "end_time" in data and data["end_time"] is not None:
        data["end_time"] = parse_time(data["end_time"])

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
def register_for_event_action(payload: EventRegistrationCreate, db: Session = Depends(get_db)):
    return db_service.register_for_event(
        db,
        event_id=payload.event_id,
        student_id=payload.student_id,
        student_name=payload.name
    )

@router.post("/cancel-registration", status_code=status.HTTP_200_OK)
def cancel_registration_action(payload: EventRegistrationCancel, db: Session = Depends(get_db)):
    return db_service.cancel_event_registration(
        db,
        event_id=payload.event_id,
        student_id=payload.student_id
    )
