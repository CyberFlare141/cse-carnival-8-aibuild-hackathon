import logging
from typing import Any, Optional
from datetime import datetime, date, time
from sqlalchemy.orm import Session

from google import genai
from google.genai import types

from backend.config import settings
from backend.services import db_service

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. System Prompt
# ---------------------------------------------------------------------------
SYSTEM_INSTRUCTION = """You are CampusOS, an intelligent AI university platform assistant for students at AUST.
You understand and act on real-time campus data.

CRITICAL RULES:
1. Ground all answers in real-time data retrieved via the provided tools. Never answer from hardcoded knowledge or guess.
2. The current semester reference date is September 2026 (Fall 2026). The university week runs Sunday to Thursday. Friday and Saturday are weekends.
3. Taking Actions:
   - When asked to book a room (e.g. 'Book Room 7A02 tomorrow from 3 PM to 5 PM'), call the book_room tool.
   - When asked to register for an event (e.g. 'Register me for the Guest Lecture on Deep Learning'), look up the event ID if needed, then call the register_for_event tool.
   - If a student's ID or name is needed for registration and not provided, ask for it politely.
4. Handling Ambiguity:
   - If a request is vague (e.g. 'Just book me any room tomorrow afternoon'), DO NOT book anything or guess. Ask clarifying questions to determine the exact time window, capacity needs, or specific room.
5. Handling Conflicts and Unavailability:
   - If a room booking has a conflict (with another booking or a scheduled lecture), explain the conflict clearly.
   - If an event is full or cancelled, inform the student directly.
6. Never claim an action succeeded unless the tool returned a successful result.
7. Be concise, friendly, and helpful.
"""

# ---------------------------------------------------------------------------
# 2. Tool Declarations for Gemini
# ---------------------------------------------------------------------------
FUNCTION_DECLARATIONS = [
    types.FunctionDeclaration(
        name="get_schedules",
        description="List and search class timetable schedules. Filter by day of week ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday') or course code/title.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "day": types.Schema(type="STRING", description="Day of week: Sunday, Monday, Tuesday, Wednesday, Thursday"),
                "course": types.Schema(type="STRING", description="Course code (e.g. 'CSE 4113') or course title")
            }
        )
    ),
    types.FunctionDeclaration(
        name="find_available_rooms",
        description="Find vacant campus rooms on a given date and time window that satisfy capacity, room type, and equipment requirements.",
        parameters=types.Schema(
            type="OBJECT",
            required=["date", "start_time", "end_time"],
            properties={
                "date": types.Schema(type="STRING", description="Target date in YYYY-MM-DD format"),
                "start_time": types.Schema(type="STRING", description="24-hour start time in HH:MM format (e.g. '14:00')"),
                "end_time": types.Schema(type="STRING", description="24-hour end time in HH:MM format (e.g. '16:00')"),
                "min_capacity": types.Schema(type="INTEGER", description="Minimum number of seats required"),
                "equipment": types.Schema(type="STRING", description="Required equipment item (e.g. 'projector', 'computers', 'AC', 'smart board')"),
                "room_type": types.Schema(type="STRING", description="Room type: 'classroom', 'lab', or 'seminar'")
            }
        )
    ),
    types.FunctionDeclaration(
        name="book_room",
        description="Book a specific campus room for a date and time slot. Validates for conflicts against both existing bookings and scheduled classes.",
        parameters=types.Schema(
            type="OBJECT",
            required=["room_number", "booked_by", "date", "start_time", "end_time", "purpose"],
            properties={
                "room_number": types.Schema(type="STRING", description="Room code to book (e.g. '7A02', '7B01', '7C05')"),
                "booked_by": types.Schema(type="STRING", description="Name of person or club booking the room"),
                "date": types.Schema(type="STRING", description="Date in YYYY-MM-DD format"),
                "start_time": types.Schema(type="STRING", description="24h start time HH:MM"),
                "end_time": types.Schema(type="STRING", description="24h end time HH:MM"),
                "purpose": types.Schema(type="STRING", description="Purpose or description of the booking")
            }
        )
    ),
    types.FunctionDeclaration(
        name="cancel_room_booking",
        description="Cancel an existing room reservation by its booking ID (e.g. 'bk-001').",
        parameters=types.Schema(
            type="OBJECT",
            required=["booking_id"],
            properties={
                "booking_id": types.Schema(type="STRING", description="The booking ID to cancel (e.g. 'bk-001')")
            }
        )
    ),
    types.FunctionDeclaration(
        name="get_events",
        description="List and search campus events, hackathons, and guest lectures. Shows remaining seat capacity and status.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "date": types.Schema(type="STRING", description="Filter by event date in YYYY-MM-DD format"),
                "status": types.Schema(type="STRING", description="Filter by status: 'upcoming', 'ongoing', 'completed', 'full', 'cancelled'")
            }
        )
    ),
    types.FunctionDeclaration(
        name="register_for_event",
        description="Register a student for a campus event. Checks that the event is not full and prevents duplicate registration.",
        parameters=types.Schema(
            type="OBJECT",
            required=["event_id", "student_id", "student_name"],
            properties={
                "event_id": types.Schema(type="STRING", description="Unique event identifier (e.g. 'evt-001', 'evt-002')"),
                "student_id": types.Schema(type="STRING", description="Student ID (e.g. '20-40532')"),
                "student_name": types.Schema(type="STRING", description="Full name of the student registering")
            }
        )
    ),
    types.FunctionDeclaration(
        name="cancel_event_registration",
        description="Cancel a student's existing registration for an event.",
        parameters=types.Schema(
            type="OBJECT",
            required=["event_id", "student_id"],
            properties={
                "event_id": types.Schema(type="STRING", description="Unique event ID (e.g. 'evt-001')"),
                "student_id": types.Schema(type="STRING", description="Student ID (e.g. '20-40532')")
            }
        )
    ),
    types.FunctionDeclaration(
        name="get_announcements",
        description="Retrieve official campus announcements and departmental notices.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "priority": types.Schema(type="STRING", description="Filter by priority: 'high', 'medium', or 'low'"),
                "active_only": types.Schema(type="BOOLEAN", description="If true, only returns non-expired notices (default true)")
            }
        )
    ),
    types.FunctionDeclaration(
        name="get_assignments",
        description="Retrieve course assignments, homeworks, and deadlines.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "course": types.Schema(type="STRING", description="Filter by course code (e.g. 'CSE 4113')"),
                "status": types.Schema(type="STRING", description="Filter by status: 'pending', 'submitted', 'graded', 'late'"),
                "due_this_week": types.Schema(type="BOOLEAN", description="If true, filters assignments due in the next 7 days")
            }
        )
    )
]

GEMINI_TOOLS = [types.Tool(function_declarations=FUNCTION_DECLARATIONS)]

# ---------------------------------------------------------------------------
# 3. Tool Dispatcher (Executes Tool against Real Database)
# ---------------------------------------------------------------------------
def execute_tool(name: str, args: dict[str, Any], db: Session) -> Any:
    """Dispatches tool call to db_service and returns JSON-serializable result."""
    try:
        if name == "get_schedules":
            return db_service.query_schedules(
                db,
                day=args.get("day"),
                course=args.get("course")
            )
        elif name == "find_available_rooms":
            d = db_service.parse_date(args["date"])
            st = db_service.parse_time(args["start_time"])
            et = db_service.parse_time(args["end_time"])
            return db_service.find_available_rooms(
                db,
                target_date=d,
                start_time=st,
                end_time=et,
                min_capacity=args.get("min_capacity"),
                equipment=args.get("equipment"),
                room_type=args.get("room_type")
            )
        elif name == "book_room":
            d = db_service.parse_date(args["date"])
            st = db_service.parse_time(args["start_time"])
            et = db_service.parse_time(args["end_time"])
            booking = db_service.book_room(
                db,
                room_identifier=args["room_number"],
                booked_by=args["booked_by"],
                target_date=d,
                start_time=st,
                end_time=et,
                purpose=args["purpose"]
            )
            return {
                "success": True,
                "booking_id": booking.booking_id,
                "room": args["room_number"],
                "date": args["date"],
                "start_time": args["start_time"],
                "end_time": args["end_time"],
                "message": f"Room {args['room_number']} successfully booked for {args['booked_by']}."
            }
        elif name == "cancel_room_booking":
            return db_service.cancel_room_booking(db, args["booking_id"])
        elif name == "get_events":
            return db_service.query_events(
                db,
                target_date=args.get("date"),
                status_filter=args.get("status")
            )
        elif name == "register_for_event":
            return db_service.register_for_event(
                db,
                event_id=args["event_id"],
                student_id=args["student_id"],
                student_name=args["student_name"]
            )
        elif name == "cancel_event_registration":
            return db_service.cancel_event_registration(
                db,
                event_id=args["event_id"],
                student_id=args["student_id"]
            )
        elif name == "get_announcements":
            return db_service.query_announcements(
                db,
                priority=args.get("priority"),
                active_only=args.get("active_only", True)
            )
        elif name == "get_assignments":
            return db_service.query_assignments(
                db,
                course=args.get("course"),
                status_filter=args.get("status"),
                due_this_week=args.get("due_this_week", False)
            )
        else:
            return {"error": f"Unknown tool: {name}"}
    except Exception as e:
        logger.error(f"Error executing tool {name} with args {args}: {e}")
        return {"error": str(e)}

# ---------------------------------------------------------------------------
# 4. Main Chat Processing with Gemini Function Calling
# ---------------------------------------------------------------------------
def process_chat(
    message: str,
    conversation_history: list[dict],
    db: Session
) -> dict:
    """
    Orchestrates the LLM conversation with real function/tool calling.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return {
            "reply": "⚠️ Gemini API key is not configured in `.env`. Please add `GEMINI_API_KEY=your_key_here` to enable live AI agent interactions.",
            "tools_called": []
        }

    client = genai.Client(api_key=api_key)
    tools_called = []

    # Format contents history
    contents = []
    for msg in conversation_history:
        role = "user" if msg.get("role") == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.get("content", ""))]))

    # Append current user message
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))

    config = types.GenerateContentConfig(
        tools=GEMINI_TOOLS,
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.2
    )

    try:
        # Step 1: Call model with tool definitions
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=config
        )

        # Step 2: Handle function calls if model requested any
        while response.function_calls:
            # Model response with function calls
            contents.append(response.candidates[0].content)
            
            tool_response_parts = []
            for function_call in response.function_calls:
                fn_name = function_call.name
                fn_args = dict(function_call.args) if function_call.args else {}
                
                # Execute tool against live database
                tool_output = execute_tool(fn_name, fn_args, db)
                tools_called.append({
                    "tool": fn_name,
                    "arguments": fn_args,
                    "result": tool_output
                })

                # Create function response part
                tool_response_parts.append(
                    types.Part.from_function_response(
                        name=fn_name,
                        response={"result": tool_output}
                    )
                )

            # Send tool outputs back to model
            contents.append(types.Content(role="user", parts=tool_response_parts))
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config
            )

        final_reply = response.text or "I have processed your request."
        return {
            "reply": final_reply,
            "tools_called": tools_called
        }

    except Exception as e:
        logger.error(f"Error in Gemini agent interaction: {e}")
        return {
            "reply": f"An error occurred while communicating with the AI agent: {str(e)}",
            "tools_called": tools_called
        }
