from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import json

from backend.database import get_db
from backend.models import Room, RoomBooking
from backend.schemas import (
    RoomCreate, RoomUpdate, RoomResponse, BookingResponse,
    RoomBookingCreate, RoomBookingCancel
)
from backend.services import db_service

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.get("", response_model=list[RoomResponse])
def get_rooms(
    type: Optional[str] = Query(None, description="Filter by room type: classroom, lab, seminar"),
    min_capacity: Optional[int] = Query(None, description="Filter by minimum capacity"),
    equipment: Optional[str] = Query(None, description="Filter by equipment item (e.g. projector, AC)"),
    db: Session = Depends(get_db)
):
    query = db.query(Room)
    if type:
        query = query.filter(Room.type == type.lower())
    if min_capacity is not None:
        query = query.filter(Room.capacity >= min_capacity)

    rooms = query.order_by(Room.floor, Room.room_number).all()

    if equipment:
        filtered = []
        eq_lower = equipment.lower()
        for r in rooms:
            try:
                eqs = json.loads(r.equipment)
                if any(eq_lower == item.lower() for item in eqs):
                    filtered.append(r)
            except Exception:
                if eq_lower in r.equipment.lower():
                    filtered.append(r)
        return filtered

    return rooms

@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(
        (Room.id == room_id) | (Room.room_number == room_id)
    ).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_id}' not found."
        )
    return room

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(room_in: RoomCreate, db: Session = Depends(get_db)):
    # Check duplicate room_number
    if db.query(Room).filter(Room.room_number == room_in.room_number).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room with number '{room_in.room_number}' already exists."
        )

    # Generate ID if missing
    r_id = room_in.id
    if not r_id:
        existing_ids = db.query(Room.id).all()
        nums = []
        for (i,) in existing_ids:
            if i.startswith("room-"):
                try:
                    nums.append(int(i[5:]))
                except ValueError:
                    pass
        next_num = (max(nums) + 1) if nums else 1
        r_id = f"room-{next_num:03d}"

    equipment_str = json.dumps(room_in.equipment)

    new_room = Room(
        id=r_id,
        room_number=room_in.room_number,
        type=room_in.type.lower(),
        capacity=room_in.capacity,
        equipment=equipment_str,
        floor=room_in.floor,
        status=room_in.status
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

@router.put("/{room_id}", response_model=RoomResponse)
def update_room(room_id: str, room_in: RoomUpdate, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_id}' not found."
        )

    data = room_in.model_dump(exclude_unset=True)
    if "equipment" in data and data["equipment"] is not None:
        data["equipment"] = json.dumps(data["equipment"])

    if "room_number" in data and data["room_number"] != room.room_number:
        # Check uniqueness
        if db.query(Room).filter(Room.room_number == data["room_number"]).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Room number '{data['room_number']}' is already in use."
            )

    for field, val in data.items():
        setattr(room, field, val)

    room.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(room)
    return room

@router.delete("/{room_id}", status_code=status.HTTP_200_OK)
def delete_room(room_id: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_id}' not found."
        )

    db.delete(room)
    db.commit()
    return {"message": f"Room '{room_id}' successfully deleted.", "id": room_id}

# ---------------------------------------------------------------------------
# Room Actions: Booking & Cancellation
# ---------------------------------------------------------------------------
@router.post("/book", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def book_room_action(payload: RoomBookingCreate, db: Session = Depends(get_db)):
    d = db_service.parse_date(payload.date)
    st = db_service.parse_time(payload.start_time)
    et = db_service.parse_time(payload.end_time)

    booking = db_service.book_room(
        db,
        room_identifier=payload.room_identifier,
        booked_by=payload.booked_by,
        target_date=d,
        start_time=st,
        end_time=et,
        purpose=payload.purpose
    )
    return booking

@router.post("/cancel-booking", status_code=status.HTTP_200_OK)
def cancel_booking_action(payload: RoomBookingCancel, db: Session = Depends(get_db)):
    return db_service.cancel_room_booking(db, payload.booking_id)
