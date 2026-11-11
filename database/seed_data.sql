USE cmcu_event_db;
GO

DELETE FROM staff_tasks;
DELETE FROM event_eligibility;
DELETE FROM event_staffs;
DELETE FROM events;
DELETE FROM users;
DELETE FROM faculties;
GO

SET IDENTITY_INSERT faculties ON;
INSERT INTO faculties (faculty_id, faculty_name) VALUES
    (1, N'Khoa Công nghệ Thông tin & Truyền thông'),
    (2, N'Khoa Kinh doanh'),
    (3, N'Khoa Mỹ thuật');
SET IDENTITY_INSERT faculties OFF;
GO

SET IDENTITY_INSERT users ON;
INSERT INTO users (user_id, student_code, full_name, email, password, cohort, class_name, faculty_id, system_role) VALUES
    (1, 'BIT250001', N'Trần Long',      'bit250001@st.cmcu.edu.vn', '123456', 'K1', 'BIT-K1A', 1, 'STUDENT'),
    (2, 'BIT250002', N'Bùi Anh Tú',     'bit250002@st.cmcu.edu.vn', '123456', 'K1', 'BIT-K1A', 1, 'STUDENT'),
    (3, 'BBA250003', N'Lê Danh Lượng',  'bba250003@st.cmcu.edu.vn', '123456', 'K1', 'BBA-K1A', 2, 'STUDENT'),
    (4, 'STAFF001',  N'Nguyễn Thị Hương','huong.nt@cmcu.edu.vn',    '123456', NULL, NULL,      1, 'STAFF'),
    (5, 'ADMIN001',  N'Phạm Quốc Bảo',   'bao.pq@cmcu.edu.vn',       '123456', NULL, NULL,      NULL, 'ADMIN'),
    (6, 'BIT250004', N'Nguyễn Văn Phú',  'bit250004@st.cmcu.edu.vn','123456', 'K1', 'BIT-K1B', 1, 'STUDENT');
SET IDENTITY_INSERT users OFF;
GO

DECLARE @Now    DATETIME2 = SYSDATETIME();
DECLARE @Start1 DATETIME2 = DATEADD(DAY, 7,  @Now);
DECLARE @Start2 DATETIME2 = DATEADD(DAY, 14, @Now);

SET IDENTITY_INSERT events ON;
INSERT INTO events
   (event_id, title, description, location, start_time, end_time,
    seat_capacity, cancel_deadline_hours, status, created_by)
VALUES
   (1, N'Hội thảo AI & Ứng dụng trong Doanh nghiệp', N'Chia sẻ từ chuyên gia...', N'Hội trường A', @Start1, DATEADD(MINUTE, 210, @Start1), 2, 24, 'OPEN', 5),
   (2, N'Workshop Kỹ năng Thuyết trình Chuyên nghiệp', N'Rèn luyện kỹ năng...', N'Phòng 302', @Start2, DATEADD(MINUTE, 210, @Start2), 50, 24, 'OPEN', 5);
SET IDENTITY_INSERT events OFF;
GO

SET IDENTITY_INSERT event_staffs ON;
INSERT INTO event_staffs (event_staff_id, event_id, user_id, role_in_event) VALUES (1, 1, 4, N'Trưởng BTC');
SET IDENTITY_INSERT event_staffs OFF;
GO

SET IDENTITY_INSERT event_eligibility ON;
INSERT INTO event_eligibility (eligibility_id, event_id, cohort, faculty_id) VALUES (1, 1, 'K1', 1), (2, 2, 'K1', 2);
SET IDENTITY_INSERT event_eligibility OFF;
GO

DECLARE @S1 DATETIME2 = DATEADD(DAY, 7, SYSDATETIME());
SET IDENTITY_INSERT staff_tasks ON;
INSERT INTO staff_tasks (task_id, event_id, title, deadline, assignee_id, status, note) VALUES
   (1, 1, N'Đặt nước uống cho khách mời', DATEADD(DAY, -1, @S1), 4, 'TODO', N'20 chai'),
   (2, 1, N'Kiểm tra máy chiếu & micro',  DATEADD(DAY, -2, @S1), 4, 'IN_PROGRESS', NULL);
SET IDENTITY_INSERT staff_tasks OFF;
GO

PRINT '✅ Đã nạp dữ liệu mẫu thành công vào cmcu_event_db!';
GO

-- Chèn một vé mẫu cho Trần Long (user_id = 1) tham dự sự kiện 1
INSERT INTO tickets (event_id, student_id, ticket_code, qr_token, checkin_status) 
VALUES (1, 1, 'TK-E1-BIT250001', 'qr-token-gia-lap-123456789', 'REGISTERED');
GO

PRINT '✅ Đã tạo vé mẫu thành công!';