/* =============================================================
   CMCU DATABASE — DDL chuẩn hóa 3NF
   Môn: INFO2011 — Trường Đại học CMC
   ============================================================= */
IF DB_ID('CMCU') IS NULL CREATE DATABASE CMCU;
GO
USE CMCU;
GO

/* Xóa theo thứ tự ngược FK để tái tạo sạch */
DROP TABLE IF EXISTS staff_tasks;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS event_eligibility;
DROP TABLE IF EXISTS event_staffs;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS faculties;
GO

/* -------------------------------------------------------------
   1. faculties — Khoa
   ------------------------------------------------------------- */
CREATE TABLE faculties (
    faculty_id    INT IDENTITY(1,1) PRIMARY KEY,
    faculty_name  NVARCHAR(100) NOT NULL UNIQUE
);
GO

/* -------------------------------------------------------------
   2. users — Người dùng (SV / Staff / Admin)
   ------------------------------------------------------------- */
CREATE TABLE users (
    user_id       INT IDENTITY(1,1) PRIMARY KEY,
    student_code  VARCHAR(20)  NULL UNIQUE,           -- NULL với STAFF/ADMIN
    full_name     NVARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL,
    cohort        VARCHAR(10)  NULL,                  -- K1..K4
    class_name    NVARCHAR(50) NULL,
    faculty_id    INT          NULL,
    system_role   VARCHAR(10)  NOT NULL DEFAULT 'STUDENT',
    CONSTRAINT fk_users_faculty FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id),
    CONSTRAINT ck_users_role    CHECK (system_role IN ('STUDENT','STAFF','ADMIN')),
    CONSTRAINT ck_users_cohort  CHECK (cohort IS NULL OR cohort IN ('K1','K2','K3','K4')),
    CONSTRAINT ck_users_email   CHECK (email LIKE '%@st.cmcu.edu.vn' OR email LIKE '%@cmcu.edu.vn')
);
GO

/* -------------------------------------------------------------
   3. events — Sự kiện
   ------------------------------------------------------------- */
CREATE TABLE events (
    event_id               INT IDENTITY(1,1) PRIMARY KEY,
    title                  NVARCHAR(200) NOT NULL,
    description            NVARCHAR(MAX) NULL,
    location               NVARCHAR(200) NOT NULL,
    start_time             DATETIME2     NOT NULL,
    end_time               DATETIME2     NOT NULL,
    seat_capacity          INT           NOT NULL,
    cancel_deadline_hours  INT           NOT NULL DEFAULT 24,
    status                 VARCHAR(10)   NOT NULL DEFAULT 'OPEN',
    created_by             INT           NOT NULL,
    CONSTRAINT fk_events_creator  FOREIGN KEY (created_by) REFERENCES users(user_id),
    CONSTRAINT ck_events_capacity CHECK (seat_capacity > 0),
    CONSTRAINT ck_events_status   CHECK (status IN ('OPEN','FULL','CLOSED')),
    CONSTRAINT ck_events_time     CHECK (end_time > start_time)
);
GO

/* -------------------------------------------------------------
   4. event_staffs — Phân công BTC theo sự kiện
   ------------------------------------------------------------- */
CREATE TABLE event_staffs (
    event_staff_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id       INT           NOT NULL,
    user_id        INT           NOT NULL,
    role_in_event  NVARCHAR(100) NULL,
    CONSTRAINT fk_es_event FOREIGN KEY (event_id) REFERENCES events(event_id),
    CONSTRAINT fk_es_user  FOREIGN KEY (user_id)  REFERENCES users(user_id),
    CONSTRAINT uq_es_event_user UNIQUE (event_id, user_id)
);
GO

/* -------------------------------------------------------------
   5. event_eligibility — Điều kiện tham dự (Khoa + Khoá)
   ------------------------------------------------------------- */
CREATE TABLE event_eligibility (
    eligibility_id INT IDENTITY(1,1) PRIMARY KEY,
    event_id       INT         NOT NULL,
    cohort         VARCHAR(10) NOT NULL,
    faculty_id     INT         NOT NULL,
    CONSTRAINT fk_ee_event   FOREIGN KEY (event_id)   REFERENCES events(event_id),
    CONSTRAINT fk_ee_faculty FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id),
    CONSTRAINT ck_ee_cohort  CHECK (cohort IN ('K1','K2','K3','K4'))
);
GO

/* -------------------------------------------------------------
   6. tickets — Vé (ràng buộc uq_event_student 1 SV = 1 vé/sự kiện)
   ------------------------------------------------------------- */
CREATE TABLE tickets (
    ticket_id      INT IDENTITY(1,1) PRIMARY KEY,
    event_id       INT          NOT NULL,
    student_id     INT          NOT NULL,
    ticket_code    VARCHAR(50)  NOT NULL UNIQUE,
    qr_token       VARCHAR(64)  NOT NULL UNIQUE,  -- SHA-256 hex
    registered_at  DATETIME2    NOT NULL DEFAULT SYSDATETIME(),
    checkin_status VARCHAR(20)  NOT NULL DEFAULT 'REGISTERED',
    checkin_time   DATETIME2    NULL,
    checked_by     INT          NULL,
    CONSTRAINT fk_tickets_event   FOREIGN KEY (event_id)   REFERENCES events(event_id),
    CONSTRAINT fk_tickets_student FOREIGN KEY (student_id) REFERENCES users(user_id),
    CONSTRAINT fk_tickets_checker FOREIGN KEY (checked_by) REFERENCES users(user_id),
    CONSTRAINT ck_tickets_status  CHECK (checkin_status IN ('REGISTERED','CHECKED_IN','CANCELLED','ABSENT')),
    CONSTRAINT uq_event_student   UNIQUE (event_id, student_id)   -- ⭐ Chống trùng vé
);
GO

/* -------------------------------------------------------------
   7. staff_tasks — Việc hậu cần của BTC
   ------------------------------------------------------------- */
CREATE TABLE staff_tasks (
    task_id     INT IDENTITY(1,1) PRIMARY KEY,
    event_id    INT           NOT NULL,
    title       NVARCHAR(200) NOT NULL,
    deadline    DATETIME2     NULL,
    assignee_id INT           NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'TODO',
    note        NVARCHAR(MAX) NULL,
    CONSTRAINT fk_st_event    FOREIGN KEY (event_id)    REFERENCES events(event_id),
    CONSTRAINT fk_st_assignee FOREIGN KEY (assignee_id) REFERENCES users(user_id),
    CONSTRAINT ck_st_status   CHECK (status IN ('TODO','IN_PROGRESS','DONE'))
);
GO

/* =============================================================
   ⭐ STORED PROCEDURE MẪU — Chống Overbooking bằng UPDLOCK, HOLDLOCK
   (Dùng ở Bước 2 khi triển khai đăng ký vé trên SQL Server thật)
   ============================================================= */
CREATE OR ALTER PROCEDURE sp_register_ticket
    @event_id    INT,
    @student_id  INT,
    @ticket_code VARCHAR(50),
    @qr_token    VARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        /* Khoá dòng events → serialize mọi request đồng thời vào cùng sự kiện */
        DECLARE @cap INT, @status VARCHAR(10);
        SELECT @cap = seat_capacity, @status = status
        FROM events WITH (UPDLOCK, HOLDLOCK)
        WHERE event_id = @event_id;

        IF @status <> 'OPEN' THROW 50002, 'EVENT_NOT_OPEN', 1;

        DECLARE @used INT;
        SELECT @used = COUNT(*) FROM tickets
        WHERE event_id = @event_id AND checkin_status <> 'CANCELLED';

        IF @used >= @cap
        BEGIN
            UPDATE events SET status = 'FULL' WHERE event_id = @event_id;
            THROW 50001, 'EVENT_FULL', 1;
        END

        INSERT INTO tickets (event_id, student_id, ticket_code, qr_token, checkin_status)
        VALUES (@event_id, @student_id, @ticket_code, @qr_token, 'REGISTERED');

        /* Nếu vừa đầy → tự khoá FULL */
        IF @used + 1 = @cap
            UPDATE events SET status = 'FULL' WHERE event_id = @event_id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO