"""
CampusOS Backend Automated Test Suite
Verifies all REST API CRUD endpoints, Room Booking, Event Registration,
and AI Agent Tools directly against SQL Server.
"""

import sys
from pathlib import Path
from datetime import date, datetime, timedelta
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import Schedule, Room, RoomBooking, Event, EventRegistration, Announcement, Assignment
from backend.services import agent_service

client = TestClient(app)


def run_chat_error_tests():
    """Verify chat error mapping without making additional Gemini requests."""
    with patch.object(agent_service.settings, "GEMINI_API_KEY", ""):
        missing = client.post("/api/chat", json={"message": "Hello", "conversation_history": []})
    assert missing.status_code == 503
    assert missing.json()["detail"] == "Gemini API key is not configured on the backend."

    quota_error = Exception("429 RESOURCE_EXHAUSTED quota exceeded")
    with patch.object(agent_service.settings, "GEMINI_API_KEY", "configured"), patch.object(
        agent_service, "generate_content_with_retry", side_effect=quota_error
    ):
        quota = client.post("/api/chat", json={"message": "Hello", "conversation_history": []})
    assert quota.status_code == 429
    assert "quota" in quota.json()["detail"].lower()

    with patch.object(agent_service.settings, "GEMINI_API_KEY", "configured"), patch.object(
        agent_service, "generate_content_with_retry", side_effect=Exception("tool failure")
    ):
        provider = client.post("/api/chat", json={"message": "Hello", "conversation_history": []})
    assert provider.status_code == 503
    assert "backend" not in provider.json()["detail"].lower()
    print(" [PASS] Chat error mapping and request contract tests.")


def run_regression_tests():
    """Exercise date validation, active ledgers, shared venue conflicts, and assignments."""
    today = date.today()
    tomorrow = today + timedelta(days=1)
    future = today + timedelta(days=2)
    yesterday = today - timedelta(days=1)
    room = "7B05"
    created_booking_ids = []
    created_event_ids = []
    created_assignment_ids = []
    temporary_room_id = "room-regression"
    temporary_room_number = "REG-ROOM"
    second_room_id = "room-regression-2"
    second_room_number = "REG-ROOM-2"
    current_minute = datetime.now().replace(second=0, microsecond=0)
    today_start = (current_minute - timedelta(hours=1)).time()
    future_start = (current_minute + timedelta(minutes=10)).time()
    future_end = (current_minute + timedelta(minutes=40)).time()

    room_create = client.post("/api/rooms", json={
        "id": temporary_room_id, "room_number": temporary_room_number, "capacity": 20,
        "equipment": [], "floor": 9, "type": "seminar", "status": "available"
    })
    assert room_create.status_code == 201, room_create.text
    second_room_create = client.post("/api/rooms", json={
        "id": second_room_id, "room_number": second_room_number, "capacity": 20,
        "equipment": [], "floor": 9, "type": "seminar", "status": "available"
    })
    assert second_room_create.status_code == 201, second_room_create.text

    past_booking = client.post("/api/rooms/book", json={
        "room_identifier": room, "booked_by": "Regression", "date": yesterday.isoformat(),
        "start_time": "10:00", "end_time": "11:00"
    })
    assert past_booking.status_code == 400

    past_time_booking = client.post("/api/rooms/book", json={
        "room_identifier": temporary_room_number, "booked_by": "Regression", "date": today.isoformat(),
        "start_time": today_start.strftime("%H:%M"), "end_time": (current_minute - timedelta(minutes=30)).strftime("%H:%M")
    })
    assert past_time_booking.status_code == 400

    future_time_booking = client.post("/api/rooms/book", json={
        "room_identifier": temporary_room_number, "booked_by": "Regression", "date": today.isoformat(),
        "start_time": future_start.strftime("%H:%M"), "end_time": future_end.strftime("%H:%M")
    })
    assert future_time_booking.status_code == 201, future_time_booking.text
    created_booking_ids.append(future_time_booking.json()["booking_id"])

    tomorrow_early_booking = client.post("/api/rooms/book", json={
        "room_identifier": temporary_room_number, "booked_by": "Regression", "date": tomorrow.isoformat(),
        "start_time": "00:05", "end_time": "00:20"
    })
    assert tomorrow_early_booking.status_code == 201, tomorrow_early_booking.text
    created_booking_ids.append(tomorrow_early_booking.json()["booking_id"])

    first = client.post("/api/rooms/book", json={
        "room_identifier": room, "booked_by": "Regression", "date": tomorrow.isoformat(),
        "start_time": "10:00", "end_time": "12:00"
    })
    assert first.status_code == 201, first.text
    booking_id = first.json()["booking_id"]
    created_booking_ids.append(booking_id)

    overlap = client.post(f"/api/rooms/room-012/book", json={
        "date": tomorrow.isoformat(), "start_time": "11:00", "end_time": "13:00", "booked_by": "Regression"
    })
    assert overlap.status_code == 409, overlap.text

    cancel = client.post(f"/api/rooms/{room}/cancel-booking", json={"booking_id": booking_id})
    assert cancel.status_code == 200
    room_data = client.get(f"/api/rooms/{room}").json()
    assert all(item["booking_id"] != booking_id for item in room_data["bookings"])

    rebook = client.post(f"/api/rooms/room-012/book", json={
        "date": tomorrow.isoformat(), "start_time": "10:00", "end_time": "12:00", "booked_by": "Regression"
    })
    assert rebook.status_code == 201, rebook.text
    created_booking_ids.append(rebook.json()["booking_id"])

    event_payload = {
        "name": "Regression Venue Event", "date": future.isoformat(), "time": "14:00 - 16:00",
        "venue": room, "capacity": 10
    }
    event = client.post("/api/events", json=event_payload)
    assert event.status_code == 201, event.text
    event_id = event.json()["id"]
    created_event_ids.append(event_id)

    past_event = client.post("/api/events", json={
        "name": "Regression Past Start", "date": today.isoformat(),
        "start_time": today_start.strftime("%H:%M"), "end_time": future_end.strftime("%H:%M"),
        "venue": "External Regression Venue", "capacity": 10
    })
    assert past_event.status_code == 400

    today_event = client.post("/api/events", json={
        "name": "Regression Today Event", "date": today.isoformat(),
        "start_time": future_start.strftime("%H:%M"), "end_time": future_end.strftime("%H:%M"),
        "venue": second_room_number, "capacity": 10
    })
    assert today_event.status_code == 201, today_event.text
    created_event_ids.append(today_event.json()["id"])

    tomorrow_event = client.post("/api/events", json={
        "name": "Regression Tomorrow Event", "date": tomorrow.isoformat(),
        "start_time": "00:30", "end_time": "01:00", "venue": second_room_number, "capacity": 10
    })
    assert tomorrow_event.status_code == 201, tomorrow_event.text
    created_event_ids.append(tomorrow_event.json()["id"])

    ledger_event = client.post("/api/events", json={
        "name": "Regression Ledger Event", "date": future.isoformat(),
        "start_time": "14:00", "end_time": "16:00", "venue": temporary_room_number, "capacity": 10
    })
    assert ledger_event.status_code == 201, ledger_event.text
    ledger_event_id = ledger_event.json()["id"]
    created_event_ids.append(ledger_event_id)
    ledger_room = client.get(f"/api/rooms/{temporary_room_number}").json()
    ledger_entry = next(item for item in ledger_room["bookings"] if item["event_id"] == ledger_event_id)
    assert ledger_entry["title"] == "Regression Ledger Event"
    assert ledger_entry["source_type"] == "campus_event"

    past_update = client.put(f"/api/events/{ledger_event_id}", json={
        "date": today.isoformat(), "time": f"{today_start.strftime('%H:%M')} - {future_end.strftime('%H:%M')}"
    })
    assert past_update.status_code == 400

    moved = client.put(f"/api/events/{ledger_event_id}", json={"venue": second_room_number, "time": "14:00 - 16:00"})
    assert moved.status_code == 200, moved.text
    old_room = client.get(f"/api/rooms/{temporary_room_number}").json()
    assert all(item["event_id"] != ledger_event_id for item in old_room["bookings"])
    moved_room = client.get(f"/api/rooms/{second_room_number}").json()
    assert any(item["event_id"] == ledger_event_id for item in moved_room["bookings"])

    cancelled = client.put(f"/api/events/{ledger_event_id}", json={"status": "cancelled"})
    assert cancelled.status_code == 200, cancelled.text
    cancelled_room = client.get(f"/api/rooms/{second_room_number}").json()
    assert all(item["event_id"] != ledger_event_id for item in cancelled_room["bookings"])

    booking_event_conflict = client.post("/api/rooms/book", json={
        "room_identifier": room, "date": future.isoformat(), "start_time": "15:00",
        "end_time": "17:00", "booked_by": "Regression"
    })
    assert booking_event_conflict.status_code == 409

    event_overlap = client.post("/api/events", json={
        **event_payload, "name": "Regression Overlap Event", "time": "15:00 - 17:00"
    })
    assert event_overlap.status_code == 409

    past_event_id = "evt-regression-past"
    past_event = Event(
        id=past_event_id, name="Regression Past Event", description="", date=yesterday,
        start_time="10:00", end_time="11:00", end_date=yesterday, venue="Auditorium",
        organizer="Regression", capacity=10, registered=0, status="upcoming"
    )
    db = SessionLocal()
    db.add(past_event)
    db.commit()
    db.close()
    try:
        registration = client.post(f"/api/events/{past_event_id}/register", json={"name": "Regression Student"})
        assert registration.status_code == 400
    finally:
        db = SessionLocal()
        row = db.query(Event).filter(Event.id == past_event_id).first()
        if row:
            db.delete(row)
            db.commit()
        db.close()

    assignment = client.post("/api/assignments", json={
        "course": "CSE REG", "title": "Regression Assignment", "deadline": future.isoformat()
    })
    assert assignment.status_code == 201, assignment.text
    created_assignment_ids.append(assignment.json()["id"])
    assert assignment.json()["assigned_date"] == today.isoformat()

    invalid_assignment = client.post("/api/assignments", json={
        "course": "CSE REG", "title": "Invalid Assignment", "assigned_date": future.isoformat(),
        "deadline": tomorrow.isoformat()
    })
    assert invalid_assignment.status_code == 400

    db = SessionLocal()
    db.query(RoomBooking).filter(RoomBooking.booking_id.in_(created_booking_ids)).delete(synchronize_session=False)
    db.query(Event).filter(Event.id.in_(created_event_ids)).delete(synchronize_session=False)
    db.query(Assignment).filter(Assignment.id.in_(created_assignment_ids)).delete(synchronize_session=False)
    db.query(Room).filter(Room.id == temporary_room_id).delete(synchronize_session=False)
    db.query(Room).filter(Room.id == second_room_id).delete(synchronize_session=False)
    db.commit()
    db.close()
    print(" [PASS] Regression tests: dates, active ledger, cross-feature conflicts, and assignments.")

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
    assert len(events) >= 7
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
    assert len(assignments) >= 8
    print(f" [PASS] GET /api/assignments returns {len(assignments)} assignments.")

    res_pending = client.get("/api/assignments?status=pending")
    assert res_pending.status_code == 200
    assert len(res_pending.json()) >= 6
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
    assert len(t_asgn) >= 6
    print(" [PASS] AI Tool: get_assignments(status='pending') -> 6 assignments.")

    db.close()

    # 8. POST /api/chat endpoint
    with patch.object(agent_service, "process_chat", return_value={
        "reply": "Mocked schedule response", "tools_called": []
    }):
        chat_res = client.post("/api/chat", json={"message": "What classes do I have on Wednesday?"})
    assert chat_res.status_code == 200, chat_res.text
    print(" [PASS] POST /api/chat endpoint returned successfully.")

    run_chat_error_tests()

    run_regression_tests()

    print("=" * 70)
    print("ALL BACKEND & AI ENGINE TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
