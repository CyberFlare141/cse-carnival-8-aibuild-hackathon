from sqlalchemy import Column, String, Integer, Date, Time, DateTime, ForeignKey, Text, UnicodeText, text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Schedule(Base):
    __tablename__ = "Schedules"

    id = Column(String(50), primary_key=True)
    course = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    day = Column(String(20), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    room = Column(String(50), nullable=False)
    instructor = Column(String(150), nullable=False)
    section = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Room(Base):
    __tablename__ = "Rooms"

    id = Column(String(50), primary_key=True)
    room_number = Column(String(50), unique=True, nullable=False)
    type = Column(String(50), nullable=False)
    capacity = Column(Integer, nullable=False)
    equipment = Column(UnicodeText, nullable=False, default="[]")
    floor = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="available")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bookings = relationship("RoomBooking", back_populates="room", cascade="all, delete-orphan")


class RoomBooking(Base):
    __tablename__ = "RoomBookings"

    booking_id = Column(String(50), primary_key=True)
    room_id = Column(String(50), ForeignKey("Rooms.id", ondelete="CASCADE"), nullable=False)
    booked_by = Column(String(150), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    purpose = Column(UnicodeText, nullable=False)
    status = Column(String(50), nullable=False, default="confirmed")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    room = relationship("Room", back_populates="bookings")


class Event(Base):
    __tablename__ = "Events"

    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(UnicodeText, nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    end_date = Column(Date, nullable=False)
    venue = Column(String(50), nullable=False)
    organizer = Column(String(150), nullable=False)
    capacity = Column(Integer, nullable=False)
    registered = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="upcoming")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    registrations = relationship("EventRegistration", back_populates="event", cascade="all, delete-orphan")


class EventRegistration(Base):
    __tablename__ = "EventRegistrations"

    registration_id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(50), ForeignKey("Events.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(50), nullable=False)
    name = Column(String(150), nullable=False)
    registered_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), nullable=False, default="confirmed")

    event = relationship("Event", back_populates="registrations")


class Announcement(Base):
    __tablename__ = "Announcements"

    id = Column(String(50), primary_key=True)
    title = Column(String(255), nullable=False)
    body = Column(UnicodeText, nullable=False)
    date = Column(Date, nullable=False)
    priority = Column(String(20), nullable=False)
    posted_by = Column(String(150), nullable=False)
    expires = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Assignment(Base):
    __tablename__ = "Assignments"

    id = Column(String(50), primary_key=True)
    course = Column(String(50), nullable=False)
    course_title = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(UnicodeText, nullable=False)
    assigned_date = Column(Date, nullable=False)
    deadline = Column(Date, nullable=False)
    submission_platform = Column(String(150), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    marks = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
