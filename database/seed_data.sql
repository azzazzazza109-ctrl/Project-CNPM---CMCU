USE CMCU;
GO

/* 1) Faculties */
SET IDENTITY_INSERT faculties ON;
INSERT INTO faculties (faculty_id, faculty_name) VALUES
    (1, N'Khoa Công nghệ Thông tin & Truyền thông'),
    (2, N'Khoa Kinh doanh'),
    (3, N'Khoa Mỹ thuật');
SET IDENTITY_INSERT faculties OFF;
GO

/* 2) Users — 3 SV + 1 STAFF + 1 ADMIN */
SET IDENTITY_INSERT users ON;
INSERT INTO users (user_id, student_code, full_name, email, cohort, class_name, faculty_id, system_role) VALUES
    (1, 'BIT250001', N'Trần Long',      'bit250001@st.cmcu.edu.vn', 'K1', 'BIT-K1A', 1, 'STUDENT'),
    (2, 'BIT250002', N'Bùi Anh Tú',     'bit250002@st.cmcu.edu.vn', 'K1', 'BIT-K1A', 1, 'STUDENT'),
    (3, 'BBA250003', N'Lê Danh Lượng',  'bba250003@st.cmcu.edu.vn', 'K1', 'BBA-K1A', 2, 'STUDENT'),
    (4, NULL,        N'Nguyễn Thị Hương','huong.nt@cmcu.edu.vn',    NULL, NULL,      1, 'STAFF'),
    (5, NULL,        N'Phạm Quốc Bảo',   'bao.pq@cmcu.edu.vn',       NULL, NULL,      NULL, 'ADMIN'),
    (6, 'BIT250004', N'Nguyễn Văn Phú',    'bit250004@st.cmcu.edu.vn','K1', 'BIT-K1B', 1,    'STUDENT');
SET IDENTITY_INSERT users OFF;
GO

/* ---- Ngày động: Event 1 sau 7 ngày, Event 2 sau 14 ngày ---- */
DECLARE @Now    DATETIME2 = SYSDATETIME();
DECLARE @Start1 DATETIME2 = DATEADD(DAY, 7,  @Now);
DECLARE @Start2 DATETIME2 = DATEADD(DAY, 14, @Now);

SET IDENTITY_INSERT events ON;
INSERT INTO events
   (event_id, title, description, location, start_time, end_time,
    seat_capacity, cancel_deadline_hours, status, created_by)
VALUES
   (1, N'Hội thảo AI & Ứng dụng trong Doanh nghiệp',
       N'Chia sẻ từ chuyên gia về AI, LLM và ứng dụng thực tiễn tại doanh nghiệp.',
       N'Campus Vạn Phúc - Hội trường A',
       @Start1, DATEADD(MINUTE, 210, @Start1),          -- ⭐ động
       2, 24, 'OPEN', 5),
   (2, N'Workshop Kỹ năng Thuyết trình Chuyên nghiệp',
       N'Rèn luyện kỹ năng thuyết trình và giao tiếp trước công chúng.',
       N'Tòa nhà CMC Tower - Phòng 302',
       @Start2, DATEADD(MINUTE, 210, @Start2),          -- ⭐ động
       50, 24, 'OPEN', 5);
SET IDENTITY_INSERT events OFF;
GO

/* staff_tasks cũng nên dùng ngày động */
DECLARE @S1 DATETIME2 = DATEADD(DAY, 7, SYSDATETIME());
SET IDENTITY_INSERT staff_tasks ON;
INSERT INTO staff_tasks (task_id, event_id, title, deadline, assignee_id, status, note)
VALUES
   (1, 1, N'Đặt nước uống cho khách mời', DATEADD(DAY, -1, @S1), 4, 'TODO',        N'20 chai'),
   (2, 1, N'Kiểm tra máy chiếu & micro',  DATEADD(DAY, -2, @S1), 4, 'IN_PROGRESS', NULL);
SET IDENTITY_INSERT staff_tasks OFF;
GO

/* 4) Event Staffs */
SET IDENTITY_INSERT event_staffs ON;
INSERT INTO event_staffs (event_staff_id, event_id, user_id, role_in_event)
VALUES (1, 1, 4, N'Trưởng BTC');
SET IDENTITY_INSERT event_staffs OFF;
GO

/* 5) Event Eligibility */
SET IDENTITY_INSERT event_eligibility ON;
INSERT INTO event_eligibility (eligibility_id, event_id, cohort, faculty_id) VALUES
    (1, 1, 'K1', 1),   -- Sự kiện 1: chỉ K1 CNTT&TT
    (2, 2, 'K1', 2);   -- Sự kiện 2: chỉ K1 Kinh doanh
SET IDENTITY_INSERT event_eligibility OFF;
GO

/* 6) Tickets — bỏ trống, để test TC-01..TC-03 ở Bước 2 */
-- (không insert)

/* 7) Staff Tasks */
SET IDENTITY_INSERT staff_tasks ON;
INSERT INTO staff_tasks (task_id, event_id, title, deadline, assignee_id, status, note) VALUES
    (1, 1, N'Đặt nước uống cho khách mời', '2025-12-14T17:00:00', 4, 'TODO',        N'20 chai'),
    (2, 1, N'Kiểm tra máy chiếu & micro',  '2025-12-14T09:00:00', 4, 'IN_PROGRESS', NULL);
SET IDENTITY_INSERT staff_tasks OFF;
GO

PRINT '✅ Seed data CMCU loaded successfully.';
GO