-- ============================================================================
-- CampusOS Official Seed Data
-- Populates database from official JSON files in data/
-- ============================================================================
USE CampusOS;
GO

SET NOCOUNT ON;
BEGIN TRANSACTION;

-- Clear existing seed data in reverse dependency order
DELETE FROM dbo.EventRegistrations;
DELETE FROM dbo.RoomBookings;
DELETE FROM dbo.Events;
DELETE FROM dbo.Rooms;
DELETE FROM dbo.Schedules;
DELETE FROM dbo.Announcements;
DELETE FROM dbo.Assignments;
GO

-- ----------------------------------------------------------------------------
-- 1. Schedules (24 records)
-- ----------------------------------------------------------------------------
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-001', 'CSE 4113', 'Pattern Recognition and Machine Learning', 'Sunday', '13:00', '13:50', '7A07', 'Prof. Dr. Md. Shahriar Mahbub', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-002', 'CSE 4173', 'Cyber Security', 'Sunday', '11:20', '12:10', '7A03', 'Prof. Dr. Md. Shamim Akhter', 'CS');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-003', 'CSE 4114', 'Pattern Recognition and Machine Learning Lab', 'Sunday', '13:00', '14:40', '7B08', 'Prof. Dr. Md. Shahriar Mahbub', 'B1/B2');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-004', 'CSE 4129', 'Formal Languages and Compilers', 'Sunday', '08:00', '08:50', '7A05', 'Ms. Nusrat Jahan', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-005', 'IPE 4111', 'Industrial Management', 'Sunday', '09:40', '10:30', '7A05', 'TBA', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-006', 'CSE 4113', 'Pattern Recognition and Machine Learning', 'Sunday', '10:30', '11:20', '7A03', 'Prof. Dr. Md. Shahriar Mahbub', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-007', 'CSE 4137', 'Soft Computing', 'Monday', '16:20', '17:10', '7A03', 'Prof. Dr. Faisal Muhammad Shah', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-008', 'CSE 4141', 'Data Warehousing and Mining', 'Monday', '17:10', '18:00', '7A03', 'Mr. Saha Reno', 'DWM');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-009', 'CSE 4113', 'Pattern Recognition and Machine Learning', 'Monday', '13:00', '13:50', '7A07', 'Prof. Dr. Md. Shahriar Mahbub', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-010', 'CSE 4173', 'Cyber Security', 'Monday', '13:50', '14:40', '7A07', 'Prof. Dr. Md. Shamim Akhter', 'CS');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-011', 'IPE 4111', 'Industrial Management', 'Tuesday', '08:00', '08:50', '7C07', 'TBA', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-012', 'IPE 4111', 'Industrial Management', 'Tuesday', '08:50', '09:40', '7C07', 'TBA', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-013', 'CSE 4138', 'Soft Computing Lab', 'Tuesday', '11:20', '13:00', '7B01', 'Mr. Raihan Tanvir', 'B1/B2');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-014', 'CSE 4130', 'Formal Languages and Compilers Lab', 'Wednesday', '08:00', '09:40', '7B06', 'Ms. Nusrat Jahan', 'B1/B2');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-015', 'CSE 4113', 'Pattern Recognition and Machine Learning', 'Wednesday', '13:00', '13:50', '7A04', 'Prof. Dr. Md. Shahriar Mahbub', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-016', 'CSE 4141', 'Data Warehousing and Mining', 'Wednesday', '13:50', '15:30', '7A05', 'Mr. Saha Reno', 'DWM');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-017', 'CSE 4173', 'Cyber Security', 'Wednesday', '13:50', '15:30', '7A04', 'Prof. Dr. Md. Shamim Akhter', 'CS');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-018', 'CSE 4137', 'Soft Computing', 'Wednesday', '14:40', '15:30', '7A04', 'Prof. Dr. Faisal Muhammad Shah', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-019', 'CSE 4141', 'Data Warehousing and Mining', 'Thursday', '09:40', '10:30', '7A03', 'Mr. Saha Reno', 'DWM');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-020', 'CSE 4174', 'Cyber Security Lab', 'Thursday', '11:20', '13:00', '9A05', 'Ms. Nawrin Tabassum', 'CSGr-1');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-021', 'CSE 4142', 'Data Warehousing and Mining Lab', 'Thursday', '11:20', '13:00', '7B08', 'Mr. Saha Reno', 'DWMGr-1');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-022', 'CSE 4129', 'Formal Languages and Compilers', 'Thursday', '13:00', '13:50', '7A06', 'Ms. Nusrat Jahan', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-023', 'CSE 4129', 'Formal Languages and Compilers', 'Thursday', '13:50', '14:40', '7A06', 'Ms. Nusrat Jahan', 'B');
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section) VALUES ('sch-024', 'CSE 4137', 'Soft Computing', 'Thursday', '14:40', '15:30', '7A06', 'Prof. Dr. Faisal Muhammad Shah', 'B');
GO

-- ----------------------------------------------------------------------------
-- 2. Rooms (20 records) and Initial RoomBookings
-- ----------------------------------------------------------------------------
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-001', '7A01', 'classroom', 40, N'["whiteboard", "projector", "AC"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-002', '7A02', 'classroom', 40, N'["whiteboard", "projector", "AC"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-003', '7A03', 'classroom', 45, N'["whiteboard", "projector", "AC", "smart board"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-004', '7A04', 'classroom', 45, N'["whiteboard", "projector", "AC"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-005', '7A05', 'classroom', 40, N'["whiteboard", "projector", "AC"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-006', '7A06', 'classroom', 40, N'["whiteboard", "projector", "AC"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-007', '7A07', 'classroom', 50, N'["whiteboard", "projector", "AC", "document camera"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-008', '7B01', 'lab', 30, N'["computers", "AC", "projector", "whiteboard"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-009', '7B02', 'lab', 30, N'["computers", "AC", "projector"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-010', '7B03', 'lab', 25, N'["computers", "AC", "projector"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-011', '7B04', 'lab', 25, N'["computers", "AC"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-012', '7B05', 'lab', 30, N'["computers", "AC", "projector", "whiteboard"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-013', '7B06', 'lab', 30, N'["computers", "AC", "projector", "whiteboard"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-014', '7B07', 'lab', 35, N'["computers", "AC", "projector", "smart board"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-015', '7B08', 'lab', 35, N'["computers", "AC", "projector", "whiteboard"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-016', '7C01', 'seminar', 60, N'["projector", "AC", "whiteboard", "microphone", "podium"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-017', '7C02', 'seminar', 60, N'["projector", "AC", "whiteboard", "microphone"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-018', '7C03', 'seminar', 55, N'["projector", "AC", "whiteboard", "microphone"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-019', '7C04', 'seminar', 55, N'["projector", "AC", "whiteboard"]', 7, 'available');
INSERT INTO dbo.Rooms (id, room_number, type, capacity, equipment, floor, status) VALUES ('room-020', '7C05', 'seminar', 70, N'["projector", "AC", "whiteboard", "microphone", "podium", "smart board"]', 7, 'available');
GO

-- Room Bookings (3 records from rooms.json)
INSERT INTO dbo.RoomBookings (booking_id, room_id, booked_by, date, start_time, end_time, purpose, status) VALUES ('bk-001', 'room-006', 'Nusrat Jahan', '2026-09-07', '13:00', '14:40', 'CSE 4129 Extra Class', 'confirmed');
INSERT INTO dbo.RoomBookings (booking_id, room_id, booked_by, date, start_time, end_time, purpose, status) VALUES ('bk-002', 'room-011', 'Raihan Tanvir', '2026-09-05', '14:00', '16:00', 'CSE 4138 Lab makeup', 'confirmed');
INSERT INTO dbo.RoomBookings (booking_id, room_id, booked_by, date, start_time, end_time, purpose, status) VALUES ('bk-003', 'room-017', 'AUSTPIC', '2026-09-06', '15:00', '18:00', 'Hackathon Orientation Session', 'confirmed');
GO

-- ----------------------------------------------------------------------------
-- 3. Events (7 records) and Initial EventRegistrations
-- ----------------------------------------------------------------------------
INSERT INTO dbo.Events (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, status) VALUES ('evt-001', 'AUSTPIC AI Build Hackathon', '24-hour hackathon focused on building AI-powered applications. Open to all CSE students.', '2026-09-10', '09:00', '09:00', '2026-09-11', '7C01', 'AUSTPIC', 60, 47, 'upcoming');
INSERT INTO dbo.Events (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, status) VALUES ('evt-002', 'Guest Lecture: Deep Learning in Medical Imaging', 'Industry talk by Dr. Iftekhar Ahmed (BUET) on practical applications of CNNs in Bangladeshi healthcare.', '2026-09-08', '14:00', '16:00', '2026-09-08', '7C05', 'CSE Department', 70, 62, 'upcoming');
INSERT INTO dbo.Events (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, status) VALUES ('evt-003', 'Soft Computing Mid-Term Review Session', 'Extra prep session by FMS sir before the midterm. Covers fuzzy logic and neural network basics.', '2026-09-06', '16:00', '18:00', '2026-09-06', '7A04', 'Prof. Dr. Faisal Muhammad Shah', 45, 38, 'upcoming');
INSERT INTO dbo.Events (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, status) VALUES ('evt-004', 'AUST CSE Carnival 8.0 Planning Meeting', 'Volunteers and organizers meeting to finalize event lineup, venue layout, and task assignments for CSE Carnival.', '2026-09-05', '15:30', '17:00', '2026-09-05', '7C02', 'AUSTPIC', 30, 22, 'upcoming');
INSERT INTO dbo.Events (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, status) VALUES ('evt-005', 'Freshers'' Orientation — CSE Fall 2026', 'Welcome session for newly admitted CSE students. Department heads, club representatives, and senior students will speak.', '2026-09-12', '10:00', '13:00', '2026-09-12', '7C05', 'CSE Department', 70, 55, 'upcoming');
INSERT INTO dbo.Events (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, status) VALUES ('evt-006', 'Workshop: Git & GitHub for Beginners', 'Hands-on workshop covering Git basics, branching, pull requests, and open-source contribution workflow.', '2026-09-07', '13:00', '15:00', '2026-09-07', '7B05', 'AUSTPIC', 30, 30, 'full');
INSERT INTO dbo.Events (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, status) VALUES ('evt-007', 'Inter-University Programming Contest (IUPC) Selection', 'Internal selection round for AUST''s IUPC team. Top performers will represent AUST.', '2026-09-13', '10:00', '13:00', '2026-09-13', '7B06', 'AUSTPIC', 30, 18, 'upcoming');
GO

-- Event Registrations (9 records from events.json)
INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ('evt-001', '20-40532', 'Sakibul Hassan', 'confirmed');
INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ('evt-001', '20-40511', 'Farhan Ahmed', 'confirmed');
INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ('evt-001', '20-40498', 'Tasnia Islam', 'confirmed');
INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ('evt-002', '20-40532', 'Sakibul Hassan', 'confirmed');
INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ('evt-002', '21-41205', 'Rafi Hossain', 'confirmed');
INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ('evt-003', '20-40532', 'Sakibul Hassan', 'confirmed');
INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ('evt-003', '20-40511', 'Farhan Ahmed', 'confirmed');
INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ('evt-004', '20-40532', 'Sakibul Hassan', 'confirmed');
INSERT INTO dbo.EventRegistrations (event_id, student_id, name, status) VALUES ('evt-006', '21-41205', 'Rafi Hossain', 'confirmed');
GO

-- ----------------------------------------------------------------------------
-- 4. Announcements (8 records)
-- ----------------------------------------------------------------------------
INSERT INTO dbo.Announcements (id, title, body, date, priority, posted_by, expires) VALUES ('ann-001', 'CSE 4113 Class Rescheduled — Sunday 7 Sep', 'The CSE 4113 (Pattern Recognition) class scheduled for Sunday, 7th September at 1:00 PM in Room 7A07 has been moved to Room 7A04 at 3:30 PM on the same day. Students must attend the rescheduled slot. — Prof. Dr. Md. Shahriar Mahbub', '2026-09-04', 'high', 'Prof. Dr. Md. Shahriar Mahbub', '2026-09-07');
INSERT INTO dbo.Announcements (id, title, body, date, priority, posted_by, expires) VALUES ('ann-002', 'CSE 4137 Midterm Syllabus', 'Soft Computing midterm will cover: Fuzzy Sets and Logic (Chapters 1-3), Neural Networks basics (Chapter 4), and Genetic Algorithms introduction (Chapter 5). Exam date will be announced by the department. Refer to the course slides shared on Google Classroom. — Prof. Dr. Faisal Muhammad Shah', '2026-09-03', 'high', 'Prof. Dr. Faisal Muhammad Shah', '2026-09-20');
INSERT INTO dbo.Announcements (id, title, body, date, priority, posted_by, expires) VALUES ('ann-003', 'IPE 4111 Instructor Update', 'The instructor for IPE 4111 (Industrial Management) has been finalized. Classes will now be conducted by Mr. Md. Arif Hossain starting from next week. The class schedule and room remain unchanged. — CSE Department', '2026-09-02', 'medium', 'CSE Department', '2026-09-10');
INSERT INTO dbo.Announcements (id, title, body, date, priority, posted_by, expires) VALUES ('ann-004', 'Library Closed — September 5 (Friday)', 'The AUST Central Library will remain closed on Friday, 5th September 2026 due to maintenance work. All reading rooms, digital resource stations, and the lending counter will be unavailable. Normal operations resume on Saturday. — Library Authority', '2026-09-03', 'low', 'Library Authority', '2026-09-05');
INSERT INTO dbo.Announcements (id, title, body, date, priority, posted_by, expires) VALUES ('ann-005', 'CSE 4130 Lab Assignment Submission Deadline Extended', 'The deadline for CSE 4130 (Formal Languages and Compilers Lab) Assignment 2 has been extended to 10th September 2026 (Wednesday). Submit your report in PDF format on Google Classroom before 11:59 PM. No further extensions will be granted. — Ms. Nusrat Jahan / Ms. Tasnuva Binte Rahman', '2026-09-01', 'high', 'Ms. Nusrat Jahan', '2026-09-10');
INSERT INTO dbo.Announcements (id, title, body, date, priority, posted_by, expires) VALUES ('ann-006', 'AUSTPIC Membership Drive — Fall 2026', 'AUST Programming and Informatics Club (AUSTPIC) is now accepting new members for the Fall 2026 semester. All CSE students are eligible. Fill out the Google Form (link in bio) before 8th September. Selected members will be notified via email. — AUSTPIC', '2026-09-01', 'medium', 'AUSTPIC', '2026-09-08');
INSERT INTO dbo.Announcements (id, title, body, date, priority, posted_by, expires) VALUES ('ann-007', 'Canteen Price Update — Effective Immediately', 'Due to recent supply cost increases, canteen prices have been revised. Full lunch meal is now BDT 80 (previously BDT 65). Snacks and beverages remain unchanged. We apologize for the inconvenience. — AUST Canteen Management', '2026-08-30', 'low', 'AUST Administration', '2026-12-31');
INSERT INTO dbo.Announcements (id, title, body, date, priority, posted_by, expires) VALUES ('ann-008', 'Emergency: Water Supply Disruption — Building 7', 'Due to an emergency pipe repair, water supply to the 7th floor (Building 7) will be disrupted on Saturday, 6th September from 8:00 AM to 1:00 PM. Students are advised to carry water. Labs and classrooms on this floor will remain operational. — Maintenance Department', '2026-09-04', 'high', 'Maintenance Department', '2026-09-06');
GO

-- ----------------------------------------------------------------------------
-- 5. Assignments (8 records)
-- ----------------------------------------------------------------------------
INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks) VALUES ('asgn-001', 'CSE 4113', 'Pattern Recognition and Machine Learning', 'Assignment 1: Bayes Classifier Implementation', 'Implement a Naive Bayes classifier from scratch in Python. Use the provided Iris dataset. Submit your .ipynb file and a 1-page PDF report. No sklearn for the classifier itself.', '2026-08-28', '2026-09-09', 'Google Classroom', 'pending', 10);
INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks) VALUES ('asgn-002', 'CSE 4130', 'Formal Languages and Compilers Lab', 'Assignment 2: Lexical Analyzer using Flex', 'Write a lexical analyzer for a subset of C language using Flex (Fast Lexical Analyzer). Your analyzer must correctly tokenize keywords, identifiers, operators, and literals. Submit your .l file and a test run screenshot.', '2026-08-25', '2026-09-10', 'Google Classroom', 'pending', 15);
INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks) VALUES ('asgn-003', 'CSE 4137', 'Soft Computing', 'Term Paper: Fuzzy Logic Application in Real Life', 'Write a 2000-word term paper on a real-world application of fuzzy logic (e.g., washing machines, traffic control, medical diagnosis). Include diagrams, membership functions, and a brief comparison with crisp logic.', '2026-08-20', '2026-09-15', 'Physical submission to FMS sir', 'pending', 20);
INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks) VALUES ('asgn-004', 'CSE 4142', 'Data Warehousing and Mining Lab', 'Lab Report 1: Data Preprocessing with WEKA', 'Perform data preprocessing on the provided sales dataset using WEKA. Apply normalization, handle missing values, and discretize attributes. Submit a lab report with screenshots of each step.', '2026-08-27', '2026-09-07', 'Physical submission', 'submitted', 10);
INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks) VALUES ('asgn-005', 'CSE 4173', 'Cyber Security', 'Assignment 1: CIA Triad Analysis of a Real Breach', 'Choose a well-documented cybersecurity breach (e.g., Sony Pictures, Equifax). Analyze it using the CIA Triad framework. Discuss which pillars were violated, how, and what preventive measures could have been taken. 1500 words max.', '2026-08-29', '2026-09-11', 'Google Classroom', 'pending', 10);
INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks) VALUES ('asgn-006', 'CSE 4129', 'Formal Languages and Compilers', 'Problem Set 1: DFA and NFA Construction', 'Solve 5 problems on constructing DFAs and NFAs for given languages. Also convert the given NFA to DFA using the subset construction method. Show all states and transitions clearly.', '2026-08-26', '2026-09-04', 'Physical submission in class', 'submitted', 10);
INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks) VALUES ('asgn-007', 'CSE 4141', 'Data Warehousing and Mining', 'Assignment 1: Data Warehouse Schema Design', 'Design a star schema and snowflake schema for a fictional e-commerce company. Identify fact tables, dimension tables, and define all attributes. Submit as a PDF with ER diagrams.', '2026-09-01', '2026-09-14', 'Google Classroom', 'pending', 15);
INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks) VALUES ('asgn-008', 'CSE 4114', 'Pattern Recognition and Machine Learning Lab', 'Lab Assignment 1: Feature Extraction and Visualization', 'Using the MNIST dataset, extract features using PCA and t-SNE. Plot the results and compare. Submit your .ipynb and a brief PDF analysis. Use Python with sklearn and matplotlib.', '2026-09-03', '2026-09-17', 'Google Classroom', 'pending', 10);
GO

COMMIT TRANSACTION;
PRINT 'CampusOS database seeded successfully!';
GO