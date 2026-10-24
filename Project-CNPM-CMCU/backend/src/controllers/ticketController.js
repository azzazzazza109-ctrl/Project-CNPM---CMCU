const { sql, poolPromise } = require('../config/db');
const { generateTicketQR } = require('../services/qrServices');

// 1. API Đăng ký vé
exports.registerTicket = async (req, res) => {
    const { event_id } = req.body;
    const student_id = req.session.user.user_id; // Lấy ID từ session đăng nhập

    try {
        const pool = await poolPromise;

        const eventResult = await pool.request()
            .input('event_id', sql.Int, event_id)
            .query("SELECT seat_capacity, (SELECT COUNT(*) FROM TICKETS WHERE event_id = @event_id AND checkin_status != 'CANCELLED') as registered FROM EVENTS WHERE event_id = @event_id");
        
        if (eventResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Sự kiện không tồn tại!" });
        }
        const event = eventResult.recordset[0];

        const studentResult = await pool.request()
            .input('id', sql.Int, student_id)
            .query("SELECT student_code FROM USERS WHERE user_id = @id");
        const student = studentResult.recordset[0];

        const checkDup = await pool.request()
            .input('event_id', sql.Int, event_id)
            .input('student_id', sql.Int, student_id)
            .query("SELECT * FROM TICKETS WHERE event_id = @event_id AND student_id = @student_id AND checkin_status != 'CANCELLED'");
        if (checkDup.recordset.length > 0) {
            return res.status(400).json({ success: false, message: "Bạn đã đăng ký vé này rồi!" });
        }

        if (event.registered >= event.seat_capacity) {
            return res.status(409).json({ success: false, message: "Sự kiện đã hết chỗ!" });
        }

        const { ticket_code, qr_token } = generateTicketQR(event_id, student.student_code);
        await pool.request()
            .input('event_id', sql.Int, event_id)
            .input('student_id', sql.Int, student_id)
            .input('ticket_code', sql.VarChar(50), ticket_code)
            .input('qr_token', sql.VarChar(255), qr_token)
            .query("INSERT INTO TICKETS (event_id, student_id, ticket_code, qr_token) VALUES (@event_id, @student_id, @ticket_code, @qr_token)");

        res.status(201).json({ success: true, message: "Đăng ký thành công!", data: { ticket_code, qr_token } });

    } catch (error) {
        console.error("🔥 LỖI ĐĂNG KÝ:", error);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

// 2. API Check-in (Dành cho Scanner)
exports.checkinTicket = async (req, res) => {
    const { qr_token } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('qr_token', sql.VarChar(255), qr_token)
            .query("SELECT ticket_id, checkin_status, checkin_time FROM TICKETS WHERE qr_token = @qr_token OR ticket_code = @qr_token");

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Mã vé không hợp lệ!" });
        }

        const ticket = result.recordset[0];
        if (ticket.checkin_status === 'CHECKED_IN') {
            return res.status(400).json({ success: false, message: `Vé đã được sử dụng lúc ${ticket.checkin_time}` });
        }

        const now = new Date();
        const timeString = `${now.getHours()}:${now.getMinutes()} - ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;

        await pool.request()
            .input('ticket_id', sql.Int, ticket.ticket_id)
            .input('checkin_time', sql.NVarChar(100), timeString)
            .query("UPDATE TICKETS SET checkin_status = 'CHECKED_IN', checkin_time = @checkin_time WHERE ticket_id = @ticket_id");

        res.json({ success: true, message: "Điểm danh thành công!" });
    } catch (error) {
        console.error("🔥 LỖI CHECK-IN:", error);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

// 3. API Lấy danh sách vé của sinh viên
exports.getMyTickets = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.session.user.user_id)
            .query(`
                SELECT t.ticket_id, t.ticket_code, t.checkin_status, e.title AS event_title, e.start_time
                FROM TICKETS t
                INNER JOIN EVENTS e ON t.event_id = e.event_id
                WHERE t.student_id = @userId
                ORDER BY t.registered_at DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 4. API Hủy vé
exports.cancelTicket = async (req, res) => {
    const { ticket_id } = req.body;
    try {
        const pool = await poolPromise;
        
        const checkTicket = await pool.request()
            .input('ticket_id', sql.Int, ticket_id)
            .input('userId', sql.Int, req.session.user.user_id)
            .query("SELECT * FROM TICKETS WHERE ticket_id = @ticket_id AND student_id = @userId");

        if (checkTicket.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy vé hợp lệ của bạn!" });
        }

        const ticket = checkTicket.recordset[0];
        if (ticket.checkin_status === 'CHECKED_IN') {
            return res.status(400).json({ success: false, message: "Vé đã được check-in, không thể hủy!" });
        }
        if (ticket.checkin_status === 'CANCELLED') {
            return res.status(400).json({ success: false, message: "Vé này đã bị hủy trước đó rồi!" });
        }

        await pool.request()
            .input('ticket_id', sql.Int, ticket_id)
            .query("UPDATE TICKETS SET checkin_status = 'CANCELLED' WHERE ticket_id = @ticket_id");

        res.json({ success: true, message: "Hủy vé thành công! Vị trí đã được giải phóng." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};