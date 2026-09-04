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


def room_response(room: Room, db: Session) -> dict:
    return {
        "id": room.id,
        "room_number": room.room_number,
        "type": room.type,
        "capacity": room.capacity,
        "equipment": room.equipment,
        "floor": room.floor,
        "status": room.status,
        "bookings": db_service.get_room_occupancies(db, room),
    }

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
    room_responses = [room_response(room, db) for room in rooms]

    if equipment:
        filtered = []
        eq_lower = equipment.lower()
        for r, response in zip(rooms, room_responses):
            try:
                eqs = json.loads(r.equipment)
                if any(eq_lower == item.lower() for item in eqs):
                    filtered.append(response)
            except Exception:
                if eq_lower in r.equipment.lower():
                    filtered.append(response)
        return filtered

    return room_responses

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
    return room_response(room, db)

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(room_in: RoomCreate, db: Session = Depends(get_db)):
    r_num = room_in.get_room_number()
    if not r_num:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="room_number is required."
        )

    # Check duplicate room_number
    if db.query(Room).filter(Room.room_number == r_num).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room with number '{r_num}' already exists."
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
        room_number=r_num,
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

    r_num = room_in.get_room_number()
    if r_num and r_num != room.room_number:
        # Check uniqueness
        if db.query(Room).filter(Room.room_number == r_num).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Room number '{r_num}' is already in use."
            )
        room.room_number = r_num

    for field, val in data.items():
        if field not in ("roomNumber", "room_number"):
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
# Room Actions: Booking & Cancellation (supports /book & /{room_id}/book)
# ---------------------------------------------------------------------------
@router.post("/book", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
@router.post("/{room_id}/book", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def book_room_action(
    payload: RoomBookingCreate,
    room_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    target_room = room_id or payload.room_identifier
    if not target_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="room_identifier is required either in URL path or request body."
        )

    d = db_service.parse_date(payload.date)
    st = db_service.parse_time(payload.get_start_time())
    et = db_service.parse_time(payload.get_end_time())

    booking = db_service.book_room(
        db,
        room_identifier=target_room,
        booked_by=payload.get_booked_by(),
        target_date=d,
        start_time=st,
        end_time=et,
        purpose=payload.purpose or "Academic Session"
    )
    return booking

@router.post("/cancel-booking", status_code=status.HTTP_200_OK)
@router.post("/{room_id}/cancel-booking", status_code=status.HTTP_200_OK)
def cancel_booking_action(
    payload: RoomBookingCancel,
    room_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    bk_id = payload.get_booking_id()
    if not bk_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="booking_id is required."
        )
    return db_service.cancel_room_booking(db, bk_id)

