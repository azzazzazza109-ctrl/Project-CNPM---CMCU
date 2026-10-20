-- 1. BẢNG KHOA / VIỆN
CREATE TABLE faculties (
    faculty_id INT IDENTITY(1,1) PRIMARY KEY,
    faculty_name NVARCHAR(100) NOT NULL UNIQUE
);

-- 2. BẢNG NGƯỜI DÙNG
CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    student_code VARCHAR(20) UNIQUE NULL,
    full_name NVARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    cohort VARCHAR(10) NULL,
    class_name VARCHAR(30) NULL,
    faculty_id INT NULL FOREIGN KEY REFERENCES faculties(faculty_id),
    system_role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (system_role IN ('STUDENT', 'STAFF', 'ADMIN')),
    created_at DATETIME DEFAULT GETDATE()
);

-- 3. BẢNG SỰ KIỆN
CREATE TABLE events (
    event_id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    location NVARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    seat_capacity INT NOT NULL CHECK (seat_capacity > 0),
    cancel_deadline_hours INT NOT NULL DEFAULT 24,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULL', 'CLOSED')),
    created_by INT NOT NULL FOREIGN KEY REFERENCES users(user_id)
);

-- 4. BẢNG BỘ LỌC ĐIỀU KIỆN
CREATE TABLE event_eligibility (
    eligibility_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL FOREIGN KEY REFERENCES events(event_id) ON DELETE CASCADE,
    cohort VARCHAR(10) NULL,
    faculty_id INT NULL FOREIGN KEY REFERENCES faculties(faculty_id) ON DELETE CASCADE
);

-- 5. BẢNG VÉ & ĐIỂM DANH
CREATE TABLE tickets (
    ticket_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL FOREIGN KEY REFERENCES events(event_id),
    student_id INT NOT NULL FOREIGN KEY REFERENCES users(user_id),
    ticket_code VARCHAR(30) NOT NULL UNIQUE,
    qr_token VARCHAR(255) NOT NULL UNIQUE,
    registered_at DATETIME DEFAULT GETDATE(),
    checkin_status VARCHAR(20) NOT NULL DEFAULT 'REGISTERED' CHECK (checkin_status IN ('REGISTERED', 'CHECKED_IN', 'CANCELLED', 'ABSENT')),
    checkin_time DATETIME NULL,
    checked_by INT NULL FOREIGN KEY REFERENCES users(user_id),
    CONSTRAINT uq_event_student UNIQUE (event_id, student_id)
);

-- 6. BẢNG HẬU CẦN BAN TỔ CHỨC
CREATE TABLE staff_tasks (
    task_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id INT NOT NULL FOREIGN KEY REFERENCES events(event_id) ON DELETE CASCADE,
    title NVARCHAR(255) NOT NULL,
    deadline DATETIME NOT NULL,
    assignee_id INT NOT NULL FOREIGN KEY REFERENCES users(user_id),
    status VARCHAR(20) NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    note NVARCHAR(MAX) NULL
);