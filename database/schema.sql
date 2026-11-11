-- =====================================================================
-- schema.sql : 6 bảng theo tài liệu DB-03 (chuyển từ MySQL sang SQL Server)
--   ENUM          -> VARCHAR + CHECK
--   AUTO_INCREMENT-> IDENTITY(1,1)
--   VARCHAR       -> NVARCHAR (để lưu tiếng Việt có dấu)
-- Chạy được nhiều lần (chỉ tạo bảng nếu chưa có).
-- =====================================================================
USE cmcu_event_db;
GO

-- 1. faculties -------------------------------------------------------
IF OBJECT_ID(N'dbo.faculties', N'U') IS NULL
CREATE TABLE dbo.faculties (
    faculty_id   INT IDENTITY(1,1) NOT NULL,
    faculty_name NVARCHAR(100)     NOT NULL,
    CONSTRAINT PK_faculties      PRIMARY KEY (faculty_id),
    CONSTRAINT UQ_faculties_name UNIQUE (faculty_name)
);
GO

-- 2. users -----------------------------------------------------------
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
CREATE TABLE dbo.users (
    user_id      INT IDENTITY(1,1) NOT NULL,
    student_code VARCHAR(20)       NULL,
    full_name    NVARCHAR(100)     NOT NULL,
    email        VARCHAR(100)      NOT NULL,
    cohort       VARCHAR(10)       NULL,
    class_name   NVARCHAR(30)      NULL,
    faculty_id   INT               NULL,
    system_role  VARCHAR(10)       NOT NULL,
    CONSTRAINT PK_users       PRIMARY KEY (user_id),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT FK_users_faculty FOREIGN KEY (faculty_id) REFERENCES dbo.faculties(faculty_id),
    CONSTRAINT CK_users_role  CHECK (system_role IN ('STUDENT','STAFF','ADMIN'))
);
GO
-- student_code UNIQUE nhưng cho phép nhiều NULL (Admin không có mã SV)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_users_student_code')
CREATE UNIQUE INDEX UX_users_student_code ON dbo.users(student_code) WHERE student_code IS NOT NULL;
GO

-- 3. events ----------------------------------------------------------
IF OBJECT_ID(N'dbo.events', N'U') IS NULL
CREATE TABLE dbo.events (
    event_id              INT IDENTITY(1,1) NOT NULL,
    title                 NVARCHAR(255)     NOT NULL,
    description           NVARCHAR(MAX)     NULL,
    location              NVARCHAR(255)     NOT NULL,
    start_time            DATETIME          NOT NULL,
    end_time              DATETIME          NOT NULL,
    seat_capacity         INT               NOT NULL,
    cancel_deadline_hours INT               NOT NULL CONSTRAINT DF_events_cancel DEFAULT 24,
    status                VARCHAR(10)       NOT NULL CONSTRAINT DF_events_status DEFAULT 'OPEN',
    created_by            INT               NOT NULL,
    CONSTRAINT PK_events PRIMARY KEY (event_id),
    CONSTRAINT FK_events_creator FOREIGN KEY (created_by) REFERENCES dbo.users(user_id),
    CONSTRAINT CK_events_capacity CHECK (seat_capacity > 0),
    CONSTRAINT CK_events_time     CHECK (end_time > start_time),
    CONSTRAINT CK_events_cancel   CHECK (cancel_deadline_hours >= 0),
    CONSTRAINT CK_events_status   CHECK (status IN ('OPEN','FULL','CLOSED'))
);
GO

-- 4. event_eligibility -----------------------------------------------
-- Sự kiện không có dòng nào = mở cho toàn trường.
IF OBJECT_ID(N'dbo.event_eligibility', N'U') IS NULL
CREATE TABLE dbo.event_eligibility (
    eligibility_id INT IDENTITY(1,1) NOT NULL,
    event_id       INT               NOT NULL,
    cohort         VARCHAR(10)       NULL,
    faculty_id     INT               NULL,
    CONSTRAINT PK_event_eligibility PRIMARY KEY (eligibility_id),
    CONSTRAINT FK_elig_event   FOREIGN KEY (event_id)   REFERENCES dbo.events(event_id) ON DELETE CASCADE,
    CONSTRAINT FK_elig_faculty FOREIGN KEY (faculty_id) REFERENCES dbo.faculties(faculty_id)
);
GO

-- 5. tickets ---------------------------------------------------------
IF OBJECT_ID(N'dbo.tickets', N'U') IS NULL
CREATE TABLE dbo.tickets (
    ticket_id      INT IDENTITY(1,1) NOT NULL,
    event_id       INT               NOT NULL,
    student_id     INT               NOT NULL,
    ticket_code    VARCHAR(30)       NOT NULL,
    qr_token       VARCHAR(255)      NOT NULL,
    registered_at  DATETIME          NOT NULL CONSTRAINT DF_tickets_reg DEFAULT GETDATE(),
    checkin_status VARCHAR(12)       NOT NULL CONSTRAINT DF_tickets_status DEFAULT 'REGISTERED',
    checkin_time   DATETIME          NULL,
    checked_by     INT               NULL,
    CONSTRAINT PK_tickets PRIMARY KEY (ticket_id),
    CONSTRAINT FK_tickets_event   FOREIGN KEY (event_id)   REFERENCES dbo.events(event_id),
    CONSTRAINT FK_tickets_student FOREIGN KEY (student_id) REFERENCES dbo.users(user_id),
    CONSTRAINT FK_tickets_checker FOREIGN KEY (checked_by) REFERENCES dbo.users(user_id),
    CONSTRAINT UQ_tickets_code    UNIQUE (ticket_code),
    CONSTRAINT UQ_tickets_qr      UNIQUE (qr_token),
    -- Chặn 1 sinh viên lấy 2 vé trong cùng 1 sự kiện (ở mức DB, an toàn khi gọi đồng thời)
    CONSTRAINT UQ_tickets_event_student UNIQUE (event_id, student_id),
    CONSTRAINT CK_tickets_status CHECK (checkin_status IN ('REGISTERED','CHECKED_IN','CANCELLED','ABSENT'))
);
GO

-- 6. staff_tasks -----------------------------------------------------
IF OBJECT_ID(N'dbo.staff_tasks', N'U') IS NULL
CREATE TABLE dbo.staff_tasks (
    task_id     INT IDENTITY(1,1) NOT NULL,
    event_id    INT               NOT NULL,
    title       NVARCHAR(255)     NOT NULL,
    deadline    DATETIME          NOT NULL,
    assignee_id INT               NOT NULL,
    status      VARCHAR(12)       NOT NULL CONSTRAINT DF_tasks_status DEFAULT 'TODO',
    note        NVARCHAR(MAX)     NULL,
    CONSTRAINT PK_staff_tasks PRIMARY KEY (task_id),
    CONSTRAINT FK_tasks_event    FOREIGN KEY (event_id)    REFERENCES dbo.events(event_id) ON DELETE CASCADE,
    CONSTRAINT FK_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES dbo.users(user_id),
    CONSTRAINT CK_tasks_status   CHECK (status IN ('TODO','IN_PROGRESS','DONE'))
);
GO

-- Chỉ mục phục vụ đếm vé còn chỗ & tra cứu "Vé của tôi"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tickets_student')
CREATE INDEX IX_tickets_student ON dbo.tickets(student_id);
GO

-- Bổ sung vào cuối file schema.sql (hoặc chạy trực tiếp trên SSMS)
USE cmcu_event_db;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'password')
BEGIN
    ALTER TABLE dbo.users ADD password VARCHAR(255) NOT NULL CONSTRAINT DF_users_password DEFAULT '123456';
END
GO

USE cmcu_event_db;
SELECT 'faculties' AS bang, COUNT(*) AS so_dong FROM dbo.faculties
UNION ALL SELECT 'users',             COUNT(*) FROM dbo.users
UNION ALL SELECT 'events',            COUNT(*) FROM dbo.events
UNION ALL SELECT 'event_eligibility', COUNT(*) FROM dbo.event_eligibility
UNION ALL SELECT 'tickets',           COUNT(*) FROM dbo.tickets
UNION ALL SELECT 'staff_tasks',       COUNT(*) FROM dbo.staff_tasks;

USE cmcu_event_db;
GO

-- Thêm cột password vào bảng users nếu chưa tồn tại
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'password')
BEGIN
    ALTER TABLE dbo.users ADD password VARCHAR(255) NULL;
END
GO

-- Cập nhật mật khẩu mặc định là '123456' cho các tài khoản hiện có trong database
UPDATE dbo.users SET password = '123456' WHERE password IS NULL;
GO

USE [master];
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'cmcu_app')
BEGIN
    CREATE LOGIN [cmcu_app] WITH PASSWORD = N'MatKhauApp_KhacSa!2026', CHECK_POLICY = OFF;
END
GO
USE [cmcu_event_db];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'cmcu_app')
BEGIN
    CREATE USER [cmcu_app] FOR LOGIN [cmcu_app];
    ALTER ROLE [db_datareader] ADD MEMBER [cmcu_app];
    ALTER ROLE [db_datawriter] ADD MEMBER [cmcu_app];
    ALTER ROLE [db_ddladmin] ADD MEMBER [cmcu_app];
END
GO

USE master;
GO
-- 1. Đổi mật khẩu sa (mật khẩu 123456 hết hiệu lực)
ALTER LOGIN sa WITH PASSWORD = N'MatKhauManh_DoiNgay!2026';
GO
-- 2. Tạo tài khoản riêng cho backend
CREATE LOGIN cmcu_app WITH PASSWORD = N'MatKhauApp_KhacSa!2026', CHECK_POLICY = ON;
GO
USE cmcu_event_db;
GO
CREATE USER cmcu_app FOR LOGIN cmcu_app;
ALTER ROLE db_datareader ADD MEMBER cmcu_app;   -- được đọc
ALTER ROLE db_datawriter ADD MEMBER cmcu_app;   -- được thêm/sửa/xóa dữ liệu
GO
SELECT * FROM dbo.users

USE cmcu_event_db;
GO

USE cmcu_event_db;
SELECT 'faculties' AS bang, COUNT(*) AS so_dong FROM dbo.faculties
UNION ALL SELECT 'users',             COUNT(*) FROM dbo.users
UNION ALL SELECT 'events',            COUNT(*) FROM dbo.events
UNION ALL SELECT 'event_eligibility', COUNT(*) FROM dbo.event_eligibility
UNION ALL SELECT 'tickets',           COUNT(*) FROM dbo.tickets
UNION ALL SELECT 'staff_tasks',       COUNT(*) FROM dbo.staff_tasks;

USE cmcu_event_db;
GO

-- Thêm cột password vào bảng users nếu chưa tồn tại
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.users') AND name = 'password')
BEGIN
    ALTER TABLE dbo.users ADD password VARCHAR(255) NULL;
END
GO

-- Cập nhật mật khẩu mặc định là '123456' cho các tài khoản hiện có trong database
UPDATE dbo.users SET password = '123456' WHERE password IS NULL;
GO