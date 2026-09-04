"""
CampusOS Database Seed Script Generator and Runner
Loads official JSON seed data from data/ and populates SQL Server database.
Can be executed directly via Python or used to generate database/seed.sql.
"""

import os
import sys
import json
import subprocess

def get_data_dir():
    # Detect location of data folder
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    if not os.path.exists(data_dir):
        # Fallback to local ./data
        data_dir = os.path.abspath('data')
    return data_dir

def escape_sql_string(val):
    if val is None:
        return 'NULL'
    return "'" + str(val).replace("'", "''") + "'"

def generate_seed_sql():
    data_dir = get_data_dir()
    
    with open(os.path.join(data_dir, 'schedules.json'), 'r', encoding='utf-8') as f:
        schedules = json.load(f)
        
    with open(os.path.join(data_dir, 'rooms.json'), 'r', encoding='utf-8') as f:
        rooms = json.load(f)
        
    with open(os.path.join(data_dir, 'events.json'), 'r', encoding='utf-8') as f:
        events = json.load(f)
        
    with open(os.path.join(data_dir, 'announcements.json'), 'r', encoding='utf-8') as f:
        announcements = json.load(f)
        
    with open(os.path.join(data_dir, 'assignments.json'), 'r', encoding='utf-8') as f:
        assignments = json.load(f)

    lines = []
    lines.append("-- ============================================================================")
    lines.append("-- CampusOS Official Seed Data")
    lines.append("-- Populates database from official JSON files in data/")
    lines.append("-- ============================================================================")
    lines.append("USE CampusOS;")
    lines.append("GO")
    lines.append("")
    lines.append("SET NOCOUNT ON;")
    lines.append("BEGIN TRANSACTION;")
    lines.append("")
    lines.append("-- Clear existing seed data in reverse dependency order")
    lines.append("DELETE FROM dbo.EventRegistrations;")
    lines.append("DELETE FROM dbo.RoomBookings;")
    lines.append("DELETE FROM dbo.Events;")
    lines.append("DELETE FROM dbo.Rooms;")
    lines.append("DELETE FROM dbo.Schedules;")
    lines.append("DELETE FROM dbo.Announcements;")
    lines.append("DELETE FROM dbo.Assignments;")
    lines.append("GO")
    lines.append("")

    # 1. Schedules
    lines.append("-- ----------------------------------------------------------------------------")
    lines.append(f"-- 1. Schedules ({len(schedules)} records)")
    lines.append("-- ----------------------------------------------------------------------------")
    for s in schedules:
        cid = escape_sql_string(s['id'])
        course = escape_sql_string(s['course'])
        title = escape_sql_string(s['title'])
        day = escape_sql_string(s['day'])
        start_time = escape_sql_string(s['start_time'])
        end_time = escape_sql_string(s['end_time'])
        room = escape_sql_string(s['room'])
        instructor = escape_sql_string(s['instructor'])
        section = escape_sql_string(s['section'])
        lines.append(f"INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ({cid}, {course}, {title}, {day}, {start_time}, {end_time}, {room}, {instructor}, {section});")
    lines.append("GO")
    lines.append("")

    # 2. Rooms & RoomBookings
    lines.append("-- ----------------------------------------------------------------------------")
    lines.append(f"-- 2. Rooms ({len(rooms)} records) and Initial RoomBookings")
    lines.append("-- ----------------------------------------------------------------------------")
    bookings_to_insert = []
    for r in rooms:
        rid = escape_sql_string(r['id'])
        rnum = escape_sql_string(r['room_number'])
        rtype = escape_sql_string(r['type'])
        cap = int(r['capacity'])
        floor = int(r['floor'])
        status = escape_sql_string(r['status'])
        equipment_json = json.dumps(r['equipment'])
        eq_escaped = escape_sql_string(equipment_json)
        lines.append(f"INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ({rid}, {rnum}, {rtype}, {cap}, N{eq_escaped}, {floor}, {status});")
        
        for b in r.get('bookings', []):
            bookings_to_insert.append((r['id'], b))

    lines.append("GO")
    lines.append("")

    # RoomBookings
    lines.append(f"-- Room Bookings ({len(bookings_to_insert)} records from rooms.json)")
    for room_id, b in bookings_to_insert:
        bid = escape_sql_string(b['booking_id'])
        rid = escape_sql_string(room_id)
        booked_by = escape_sql_string(b['booked_by'])
        bdate = escape_sql_string(b['date'])
        start_time = escape_sql_string(b['start_time'])
        end_time = escape_sql_string(b['end_time'])
        purpose = escape_sql_string(b['purpose'])
        lines.append(f"INSERT INTO dbo.RoomBookings (booking_id, room_id, booked_by, date, start_time, end_time, purpose, status) VALUES ({bid}, {rid}, {booked_by}, {bdate}, {start_time}, {end_time}, {purpose}, 'confirmed');")
    lines.append("GO")
    lines.append("")

    # 3. Events & EventRegistrations
    lines.append("-- ----------------------------------------------------------------------------")
    lines.append(f"-- 3. Events ({len(events)} records) and Initial EventRegistrations")
    lines.append("-- ----------------------------------------------------------------------------")
    registrations_to_insert = []
    for e in events:
        eid = escape_sql_string(e['id'])
        name = escape_sql_string(e['name'])
        desc = escape_sql_string(e['description'])
        edate = escape_sql_string(e['date'])
        start_time = escape_sql_string(e['start_time'])
        end_time = escape_sql_string(e['end_time'])
        end_date = escape_sql_string(e['end_date'])
        venue = escape_sql_string(e['venue'])
        organizer = escape_sql_string(e['organizer'])
        cap = int(e['capacity'])
        reg_count = int(e['registered'])
        status = escape_sql_string(e['status'])
        lines.append(f"INSERT INTO dbo.Events (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, status) VALUES ({eid}, {name}, {desc}, {edate}, {start_time}, {end_time}, {end_date}, {venue}, {organizer}, {cap}, {reg_count}, {status});")

        for reg in e.get('registrations', []):
            registrations_to_insert.append((e['id'], reg))

    lines.append("GO")
    lines.append("")

    # EventRegistrations
    lines.append(f"-- Event Registrations ({len(registrations_to_insert)} records from events.json)")
    for eid, reg in registrations_to_insert:
        ev_id = escape_sql_string(eid)
        sid = escape_sql_string(reg['student_id'])
        sname = escape_sql_string(reg['name'])
        lines.append(f"INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ({ev_id}, {sid}, {sname}, 'confirmed');")
    lines.append("GO")
    lines.append("")

    # 4. Announcements
    lines.append("-- ----------------------------------------------------------------------------")
    lines.append(f"-- 4. Announcements ({len(announcements)} records)")
    lines.append("-- ----------------------------------------------------------------------------")
    for a in announcements:
        aid = escape_sql_string(a['id'])
        title = escape_sql_string(a['title'])
        body = escape_sql_string(a['body'])
        adate = escape_sql_string(a['date'])
        priority = escape_sql_string(a['priority'])
        posted_by = escape_sql_string(a['posted_by'])
        expires = escape_sql_string(a['expires'])
        lines.append(f"INSERT INTO dbo.Announcements (id, title, body, date, priority, posted_by, expires) VALUES ({aid}, {title}, {body}, {adate}, {priority}, {posted_by}, {expires});")
    lines.append("GO")
    lines.append("")

    # 5. Assignments
    lines.append("-- ----------------------------------------------------------------------------")
    lines.append(f"-- 5. Assignments ({len(assignments)} records)")
    lines.append("-- ----------------------------------------------------------------------------")
    for asgn in assignments:
        asid = escape_sql_string(asgn['id'])
        course = escape_sql_string(asgn['course'])
        ctitle = escape_sql_string(asgn['course_title'])
        title = escape_sql_string(asgn['title'])
        desc = escape_sql_string(asgn['description'])
        adate = escape_sql_string(asgn['assigned_date'])
        deadline = escape_sql_string(asgn['deadline'])
        platform = escape_sql_string(asgn['submission_platform'])
        status = escape_sql_string(asgn['status'])
        marks = int(asgn['marks'])
        lines.append(f"INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks) VALUES ({asid}, {course}, {ctitle}, {title}, {desc}, {adate}, {deadline}, {platform}, {status}, {marks});")
    lines.append("GO")
    lines.append("")
    lines.append("COMMIT TRANSACTION;")
    lines.append("PRINT 'CampusOS database seeded successfully!';")
    lines.append("GO")

    return "\n".join(lines)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    seed_sql_path = os.path.join(script_dir, 'seed.sql')
    
    print("Generating seed.sql from official data/ JSON files...")
    sql_content = generate_seed_sql()
    with open(seed_sql_path, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    print(f"Generated {seed_sql_path} successfully.")

    # Check if user passed --apply or execute
    if '--apply' in sys.argv or '-a' in sys.argv:
        print("Applying seed data to SQL Server instance (.\\SQLEXPRESS)...")
        res = subprocess.run(['sqlcmd', '-S', '.\\SQLEXPRESS', '-E', '-C', '-i', seed_sql_path], capture_output=True, text=True)
        print(res.stdout)
        if res.returncode != 0:
            print("Error applying seed data:")
            print(res.stderr)
            sys.exit(1)
        else:
            print("Seed data applied successfully to CampusOS!")

if __name__ == '__main__':
    main()
