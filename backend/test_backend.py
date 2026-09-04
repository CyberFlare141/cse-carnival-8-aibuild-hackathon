"""
CampusOS Backend Automated Test Suite
Verifies all REST API CRUD endpoints, Room Booking, Event Registration,
and AI Agent Tools directly against SQL Server.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import Schedule, Room, RoomBooking, Event, EventRegistration, Announcement, Assignment
from backend.services import agent_service

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("STARTING CAMPUSOS BACKEND & AI ENGINE TEST SUITE")
    print("=" * 70)

    # 1. Health Check
    res = client.get("/api/health")
    assert res.status_code == 200, res.text
    print(" [PASS] Health check: OK")

    # 2. Schedules CRUD & Filters
    res = client.get("/api/schedules")
    assert res.status_code == 200, res.text
    schedules = res.json()
    assert len(schedules) >= 24, f"Expected at least 24 schedules, got {len(schedules)}"
    print(f" [PASS] GET /api/schedules returns {len(schedules)} records.")

    # Filter by day
    res_wed = client.get("/api/schedules?day=Wednesday")
    assert res_wed.status_code == 200
    assert len(res_wed.json()) == 5
    print(" [PASS] GET /api/schedules?day=Wednesday returns 5 classes.")

    # POST new schedule
    test_sch = {
        "course": "CSE 4999",
        "title": "Hackathon Project Presentation",
        "day": "Thursday",
        "start_time": "16:00",
        "end_time": "17:30",
        "room": "7A01",
        "instructor": "Judges Panel",
        "section": "A1"
    }
    res_create = client.post("/api/schedules", json=test_sch)
    assert res_create.status_code == 201, res_create.text
    created_sch_id = res_create.json()["id"]
    print(f" [PASS] POST /api/schedules created record ID: {created_sch_id}")

    # PUT update schedule
    res_update = client.put(f"/api/schedules/{created_sch_id}", json={"room": "7C05", "start_time": "16:30"})
    assert res_update.status_code == 200
    assert res_update.json()["room"] == "7C05"
    print(" [PASS] PUT /api/schedules updated room to 7C05.")

    # DELETE schedule
    res_del = client.delete(f"/api/schedules/{created_sch_id}")
    assert res_del.status_code == 200
    res_check = client.get(f"/api/schedules/{created_sch_id}")
    assert res_check.status_code == 404
    print(" [PASS] DELETE /api/schedules removed record and verified 404.")

    # 3. Rooms & Room Booking Action
    res = client.get("/api/rooms")
    assert res.status_code == 200
    rooms = res.json()
    assert len(rooms) == 20
    print(f" [PASS] GET /api/rooms returns {len(rooms)} rooms.")

    # Filter rooms by lab + projector + capacity >= 30
    res_filter = client.get("/api/rooms?type=lab&min_capacity=30&equipment=projector")
    assert res_filter.status_code == 200
    assert len(res_filter.json()) == 6
    print(" [PASS] GET /api/rooms?type=lab&min_capacity=30&equipment=projector returns 6 rooms.")

    # Room Booking Action: Book Room 7A02 tomorrow (2026-09-05) from 15:00 to 17:00
    booking_payload = {
        "room_identifier": "7A02",
        "booked_by": "Sakibul Hassan",
        "date": "2026-09-05",
        "start_time": "15:00",
        "end_time": "17:00",
        "purpose": "AUSTPIC Hackathon Team Meeting"
    }
    res_book = client.post("/api/rooms/book", json=booking_payload)
    assert res_book.status_code == 201, res_book.text
    created_booking = res_book.json()
    test_bk_id = created_booking["booking_id"]
    print(f" [PASS] POST /api/rooms/book created booking: {test_bk_id}")

    # Conflict check: Attempt overlapping booking for 7A02 on same date/time
    res_conflict = client.post("/api/rooms/book", json=booking_payload)
    assert res_conflict.status_code == 409, f"Expected 409 Conflict, got {res_conflict.status_code}"
    print(f" [PASS] POST /api/rooms/book correctly blocked conflict with 409: {res_conflict.json()['detail']}")

    # Cancel booking
    res_cancel_bk = client.post("/api/rooms/cancel-booking", json={"booking_id": test_bk_id})
    assert res_cancel_bk.status_code == 200
    print(" [PASS] POST /api/rooms/cancel-booking successfully cancelled booking.")

    # Clean up test booking row from DB
    db = SessionLocal()
    b_row = db.query(RoomBooking).filter(RoomBooking.booking_id == test_bk_id).first()
    if b_row:
        db.delete(b_row)
        db.commit()
    db.close()

    # 4. Events & Registration Action
    res = client.get("/api/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) == 7
    print(f" [PASS] GET /api/events returns {len(events)} events.")

    # Register for Event evt-007
    reg_payload = {
        "event_id": "evt-007",
        "student_id": "22-49999",
        "name": "Backend Test Student"
    }
    res_reg = client.post("/api/events/register", json=reg_payload)
    assert res_reg.status_code == 201, res_reg.text
    print(" [PASS] POST /api/events/register registered student.")

    # Test duplicate registration rejection
    res_dup = client.post("/api/events/register", json=reg_payload)
    assert res_dup.status_code == 409, f"Expected 409 Conflict, got {res_dup.status_code}"
    print(" [PASS] POST /api/events/register blocked duplicate with 409 Conflict.")

    # Cancel registration
    res_cancel_reg = client.post("/api/events/cancel-registration", json={"event_id": "evt-007", "student_id": "22-49999"})
    assert res_cancel_reg.status_code == 200
    print(" [PASS] POST /api/events/cancel-registration cancelled registration.")

    # 5. Announcements CRUD
    res = client.get("/api/announcements")
    assert res.status_code == 200
    announcements = res.json()
    assert len(announcements) == 8
    print(f" [PASS] GET /api/announcements returns {len(announcements)} notices.")

    res_high = client.get("/api/announcements?priority=high")
    assert res_high.status_code == 200
    assert len(res_high.json()) == 4
    print(" [PASS] GET /api/announcements?priority=high returns 4 notices.")

    # 6. Assignments CRUD
    res = client.get("/api/assignments")
    assert res.status_code == 200
    assignments = res.json()
    assert len(assignments) == 8
    print(f" [PASS] GET /api/assignments returns {len(assignments)} assignments.")

    res_pending = client.get("/api/assignments?status=pending")
    assert res_pending.status_code == 200
    assert len(res_pending.json()) == 6
    print(" [PASS] GET /api/assignments?status=pending returns 6 pending assignments.")

    # 7. AI Tool Execution Tests (Verifying all official sample query tools)
    print("--- Testing AI Agent Tools Directly Against SQL Server ---")
    db = SessionLocal()

    # Tool: get_schedules
    t_sched = agent_service.execute_tool("get_schedules", {"day": "Wednesday"}, db)
    assert len(t_sched) == 5
    print(" [PASS] AI Tool: get_schedules(day='Wednesday') -> 5 classes.")

    # Tool: find_available_rooms
    t_avail = agent_service.execute_tool("find_available_rooms", {
        "date": "2026-09-05",
        "start_time": "14:00",
        "end_time": "16:00",
        "min_capacity": 5,
        "equipment": "projector"
    }, db)
    assert len(t_avail) > 0
    print(f" [PASS] AI Tool: find_available_rooms(5 people, projector, 14:00-16:00) -> {len(t_avail)} rooms found.")

    # Tool: get_announcements
    t_ann = agent_service.execute_tool("get_announcements", {"priority": "high", "active_only": False}, db)
    assert len(t_ann) == 4
    print(" [PASS] AI Tool: get_announcements(priority='high') -> 4 notices.")

    # Tool: get_assignments
    t_asgn = agent_service.execute_tool("get_assignments", {"status": "pending"}, db)
    assert len(t_asgn) == 6
    print(" [PASS] AI Tool: get_assignments(status='pending') -> 6 assignments.")

    db.close()

    # 8. POST /api/chat endpoint
    chat_res = client.post("/api/chat", json={"message": "What classes do I have on Wednesday?"})
    assert chat_res.status_code == 200, chat_res.text
    print(" [PASS] POST /api/chat endpoint returned successfully.")

    print("=" * 70)
    print("ALL BACKEND & AI ENGINE TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
