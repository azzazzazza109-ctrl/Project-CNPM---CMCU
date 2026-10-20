INSERT INTO faculties (faculty_name) VALUES 
(N'Khoa Công nghệ Thông tin & Truyền thông'),
(N'Khoa Kinh doanh & Quản lý'),
(N'Khoa Mỹ thuật & Thiết kế'),
(N'Khoa Vi Điện tử & Viễn thông'),
(N'Khoa Ngôn ngữ');

-- 2. TÀI KHOẢN NGƯỜI DÙNG THỰC TẾ (USERS)
INSERT INTO users (student_code, full_name, email, cohort, class_name, faculty_id, system_role) VALUES 
-- Cán bộ, Giảng viên quản trị hệ thống
(NULL, N'TS. Cố vấn Học phần (Admin)', 'admin.info2011@cmcu.edu.vn', NULL, NULL, 1, 'ADMIN'),
(NULL, N'Cán bộ Soát vé Hội trường Vạn Phúc', 'staff.checkin@cmcu.edu.vn', NULL, NULL, 1, 'STAFF'),

-- 6 Sinh viên trong nhóm đồ án (Lớp 25IT - Khóa K4)
('BIT250001', N'Trần Long', 'long.tt.bit250001@st.cmcu.edu.vn', 'K4', '25IT', 1, 'STUDENT'),
('BIT250002', N'Bùi Anh Tú', 'tu.ba.bit250002@st.cmcu.edu.vn', 'K4', '25IT', 1, 'STUDENT'),
('BIT250003', N'Nguyễn Văn Công Minh', 'minh.nvc.bit250003@st.cmcu.edu.vn', 'K4', '25IT', 1, 'STUDENT'),
('BIT250004', N'Trần Lâm', 'lam.t.bit250004@st.cmcu.edu.vn', 'K4', '25IT', 1, 'STUDENT'),
('BIT250005', N'Lê Danh Lượng', 'luong.ld.bit250005@st.cmcu.edu.vn', 'K4', '25IT', 1, 'STUDENT'),
('BIT250006', N'Nguyễn Thị Yến Nhi', 'nhi.nty.bit250006@st.cmcu.edu.vn', 'K4', '25IT', 1, 'STUDENT'),

-- Sinh viên Khoa khác (phục vụ test bộ lọc Eligibility)
('BBA250102', N'Hoàng Thị Lan Anh', 'anh.htl.bba250102@st.cmcu.edu.vn', 'K4', '25BA1', 2, 'STUDENT');

-- 3. CÁC SỰ KIỆN THỰC TẾ TẠI CMCU (EVENTS)
INSERT INTO events (title, description, location, start_time, end_time, seat_capacity, cancel_deadline_hours, status, created_by) VALUES 
-- Sự kiện 1: Hội thảo chuyên đề CNTT tại Campus Hà Đông
(N'Hội thảo CMCU TechTalk: Xu hướng AI & Kiến trúc Hệ thống Phần mềm 2026', 
 N'Chia sẻ từ các chuyên gia Viện Nghiên cứu Ứng dụng Công nghệ CMC (CMC ATI) và Tập đoàn CMC dành cho sinh viên ngành CNTT.', 
 N'Hội trường lớn Tầng 2 - Campus Vạn Phúc (84C Nguyễn Thanh Bình, Hà Đông)', 
 '2026-11-20 08:30:00', '2026-11-20 11:30:00', 
 120, 24, 'OPEN', 1),

-- Sự kiện 2: Sự kiện hướng nghiệp tại Trụ sở chính Duy Tân
(N'CMC Career Day 2026: Cơ hội Thực tập và Việc làm tại Tập đoàn CMC', 
 N'Ngày hội tuyển dụng mở rộng toàn trường kết nối sinh viên với các công ty thành viên CMC Telecom, CMC Global, CMC Cyber Security.', 
 N'Hội trường Tầng 1 - Tòa nhà CMC Tower (11 Duy Tân, Cầu Giấy, Hà Nội)', 
 '2026-12-05 13:30:00', '2026-12-05 17:00:00', 
 250, 12, 'OPEN', 1);

-- 4. BỘ LỌC ĐIỀU KIỆN THAM GIA THỰC TẾ (EVENT_ELIGIBILITY)
-- Sự kiện 1: Chỉ dành cho sinh viên Khóa K4 thuộc Khoa CNTT&TT (faculty_id = 1)
INSERT INTO event_eligibility (event_id, cohort, faculty_id) VALUES 
(1, 'K4', 1);

-- Sự kiện 2: Mở cho toàn trường (không giới hạn khoa, cohort = NULL và faculty_id = NULL)
INSERT INTO event_eligibility (event_id, cohort, faculty_id) VALUES 
(2, NULL, NULL);

-- 5. PHÂN CÔNG CÔNG VIỆC HẬU CẦN BAN TỔ CHỨC (STAFF_TASKS)
INSERT INTO staff_tasks (event_id, title, deadline, assignee_id, status, note) VALUES 
(1, N'Kiểm tra đường truyền Internet và Camera quét mã QR tại cửa hội trường Vạn Phúc', '2026-11-19 17:00:00', 2, 'TODO', N'Đảm bảo quét nhận diện QR < 1.5 giây'),
(1, N'In danh sách dự phòng Mã SV (BIT250xxx) kiểm tra thủ công khi mất mạng', '2026-11-20 07:30:00', 2, 'TODO', N'Sắp xếp danh sách theo bảng chữ cái A-Z');