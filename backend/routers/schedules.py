from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from backend.database import get_db
from backend.models import Schedule
from backend.schemas import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from backend.services.db_service import parse_time

router = APIRouter(tags=["Schedules"])

@router.get("", response_model=list[ScheduleResponse])
def get_schedules(
    day: Optional[str] = Query(None, description="Filter by day of week"),
    course: Optional[str] = Query(None, description="Filter by course code or title"),
    db: Session = Depends(get_db)
):
    query = db.query(Schedule)
    if day:
        query = query.filter(Schedule.day.ilike(day.strip()))
    if course:
        query = query.filter(
            (Schedule.course.ilike(f"%{course.strip()}%")) |
            (Schedule.title.ilike(f"%{course.strip()}%"))
        )
    return query.order_by(Schedule.day, Schedule.start_time).all()

@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(schedule_id: str, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule '{schedule_id}' not found."
        )
    return schedule

@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(schedule_in: ScheduleCreate, db: Session = Depends(get_db)):
    # Generate ID if missing
    sch_id = schedule_in.id
    if not sch_id:
        existing_ids = db.query(Schedule.id).all()
        nums = []
        for (i,) in existing_ids:
            if i.startswith("sch-"):
                try:
                    nums.append(int(i[4:]))
                except ValueError:
                    pass
        next_num = (max(nums) + 1) if nums else 1
        sch_id = f"sch-{next_num:03d}"

    st = parse_time(schedule_in.start_time)
    et = parse_time(schedule_in.end_time)

    if st >= et:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time must be earlier than end_time."
        )

    new_schedule = Schedule(
        id=sch_id,
        course=schedule_in.course,
        title=schedule_in.title,
        day=schedule_in.day,
        start_time=st,
        end_time=et,
        room=schedule_in.room,
        instructor=schedule_in.instructor,
        section=schedule_in.section
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule

@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: str,
    schedule_in: ScheduleUpdate,
    db: Session = Depends(get_db)
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule '{schedule_id}' not found."
        )

    data = schedule_in.model_dump(exclude_unset=True)
    if "start_time" in data:
        data["start_time"] = parse_time(data["start_time"])
    if "end_time" in data:
        data["end_time"] = parse_time(data["end_time"])

    # Validate time if either or both are being updated
    st = data.get("start_time", schedule.start_time)
    et = data.get("end_time", schedule.end_time)
    if st >= et:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time must be earlier than end_time."
        )

    for field, val in data.items():
        setattr(schedule, field, val)

    schedule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(schedule)
    return schedule

@router.delete("/{schedule_id}", status_code=status.HTTP_200_OK)
def delete_schedule(schedule_id: str, db: Session = Depends(get_db)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule '{schedule_id}' not found."
        )

    db.delete(schedule)
    db.commit()
    return {"message": f"Schedule '{schedule_id}' successfully deleted.", "id": schedule_id}
