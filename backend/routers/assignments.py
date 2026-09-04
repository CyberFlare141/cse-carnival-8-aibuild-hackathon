from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from backend.database import get_db
from backend.models import Assignment
from backend.schemas import AssignmentCreate, AssignmentUpdate, AssignmentResponse
from backend.services.db_service import parse_date

router = APIRouter(prefix="/assignments", tags=["Assignments"])

@router.get("", response_model=list[AssignmentResponse])
def get_assignments(
    course: Optional[str] = Query(None, description="Filter by course code or title"),
    status: Optional[str] = Query(None, description="Filter by status: pending, submitted, graded, late"),
    deadline: Optional[str] = Query(None, description="Filter by deadline date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    query = db.query(Assignment)
    if course:
        query = query.filter(
            (Assignment.course.ilike(f"%{course.strip()}%")) |
            (Assignment.course_title.ilike(f"%{course.strip()}%"))
        )
    if status:
        query = query.filter(Assignment.status == status.lower())
    if deadline:
        d = parse_date(deadline)
        query = query.filter(Assignment.deadline == d)

    return query.order_by(Assignment.deadline).all()

@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(assignment_id: str, db: Session = Depends(get_db)):
    asgn = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not asgn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment '{assignment_id}' not found."
        )
    return asgn

@router.post("", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(asgn_in: AssignmentCreate, db: Session = Depends(get_db)):
    asgn_id = asgn_in.id
    if not asgn_id:
        existing_ids = db.query(Assignment.id).all()
        nums = []
        for (i,) in existing_ids:
            if i.startswith("asgn-"):
                try:
                    nums.append(int(i[5:]))
                except ValueError:
                    pass
        next_num = (max(nums) + 1) if nums else 1
        asgn_id = f"asgn-{next_num:03d}"

    adate = parse_date(asgn_in.assigned_date)
    deadline = parse_date(asgn_in.deadline)

    if deadline < adate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="deadline must be on or after assigned_date."
        )

    new_asgn = Assignment(
        id=asgn_id,
        course=asgn_in.course,
        course_title=asgn_in.course_title,
        title=asgn_in.title,
        description=asgn_in.description,
        assigned_date=adate,
        deadline=deadline,
        submission_platform=asgn_in.submission_platform,
        status=asgn_in.status.lower(),
        marks=asgn_in.marks
    )
    db.add(new_asgn)
    db.commit()
    db.refresh(new_asgn)
    return new_asgn

@router.put("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: str,
    asgn_in: AssignmentUpdate,
    db: Session = Depends(get_db)
):
    asgn = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not asgn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment '{assignment_id}' not found."
        )

    data = asgn_in.model_dump(exclude_unset=True)
    if "assigned_date" in data and data["assigned_date"] is not None:
        data["assigned_date"] = parse_date(data["assigned_date"])
    if "deadline" in data and data["deadline"] is not None:
        data["deadline"] = parse_date(data["deadline"])
    if "status" in data and data["status"] is not None:
        data["status"] = data["status"].lower()

    for field, val in data.items():
        setattr(asgn, field, val)

    asgn.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(asgn)
    return asgn

@router.delete("/{assignment_id}", status_code=status.HTTP_200_OK)
def delete_assignment(assignment_id: str, db: Session = Depends(get_db)):
    asgn = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not asgn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment '{assignment_id}' not found."
        )

    db.delete(asgn)
    db.commit()
    return {"message": f"Assignment '{assignment_id}' successfully deleted.", "id": assignment_id}
