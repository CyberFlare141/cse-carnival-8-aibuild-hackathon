from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date

from backend.database import get_db
from backend.models import Announcement
from backend.schemas import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse
from backend.services.db_service import parse_date

router = APIRouter(prefix="/announcements", tags=["Announcements"])

@router.get("", response_model=list[AnnouncementResponse])
def get_announcements(
    priority: Optional[str] = Query(None, description="Filter by priority: high, medium, low"),
    active_only: bool = Query(False, description="Only return non-expired notices"),
    db: Session = Depends(get_db)
):
    query = db.query(Announcement)
    if priority:
        query = query.filter(Announcement.priority == priority.lower())
    if active_only:
        today = date.today()
        query = query.filter(Announcement.expires >= today)

    return query.order_by(Announcement.date.desc()).all()

@router.get("/{announcement_id}", response_model=AnnouncementResponse)
def get_announcement(announcement_id: str, db: Session = Depends(get_db)):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Announcement '{announcement_id}' not found."
        )
    return ann

@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(ann_in: AnnouncementCreate, db: Session = Depends(get_db)):
    ann_id = ann_in.id
    if not ann_id:
        existing_ids = db.query(Announcement.id).all()
        nums = []
        for (i,) in existing_ids:
            if i.startswith("ann-"):
                try:
                    nums.append(int(i[4:]))
                except ValueError:
                    pass
        next_num = (max(nums) + 1) if nums else 1
        ann_id = f"ann-{next_num:03d}"

    adate = parse_date(ann_in.date)
    expires = parse_date(ann_in.expires)

    if expires < adate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expires date must be on or after announcement date."
        )

    new_ann = Announcement(
        id=ann_id,
        title=ann_in.title,
        body=ann_in.body,
        date=adate,
        priority=ann_in.priority.lower(),
        posted_by=ann_in.posted_by,
        expires=expires
    )
    db.add(new_ann)
    db.commit()
    db.refresh(new_ann)
    return new_ann

@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: str,
    ann_in: AnnouncementUpdate,
    db: Session = Depends(get_db)
):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Announcement '{announcement_id}' not found."
        )

    data = ann_in.model_dump(exclude_unset=True)
    if "date" in data and data["date"] is not None:
        data["date"] = parse_date(data["date"])
    if "expires" in data and data["expires"] is not None:
        data["expires"] = parse_date(data["expires"])

    for field, val in data.items():
        setattr(ann, field, val)

    ann.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ann)
    return ann

@router.delete("/{announcement_id}", status_code=status.HTTP_200_OK)
def delete_announcement(announcement_id: str, db: Session = Depends(get_db)):
    ann = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not ann:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Announcement '{announcement_id}' not found."
        )

    db.delete(ann)
    db.commit()
    return {"message": f"Announcement '{announcement_id}' successfully deleted.", "id": announcement_id}
