const express = require('express');
const router = express.Router();

// CƠ SỞ DỮ LIỆU GIẢ LẬP 
const db = {
    // 1. Bảng Sự kiện: Sự kiện test giới hạn 2 chỗ để dễ kiểm thử Overbooking
    events: [
        { 
            event_id: 1, 
            title: "Lễ Khai giảng Năm học 2026 - CMCU", 
            seat_capacity: 2, 
            status: "OPEN",
            cancel_deadline_hours: 24,
            start_time: "2026-11-01T08:00:00Z"
        }
    ],
    // 2. Bảng Cấu hình Điều kiện (PB-01): Chỉ mở cho K4 (cohort) thuộc Khoa CNTT (faculty_id = 1)
    event_eligibility: [
        { eligibility_id: 1, event_id: 1, cohort: "K4", faculty_id: 1 }
    ],
    // 3. Bảng Người dùng: Danh sách sinh viên thực tế CMCU
    users: [
        { user_id: 101, student_code: "BIT250001", full_name: "Trần Long", cohort: "K4", faculty_id: 1 }, // Hợp lệ (K4 - CNTT)
        { user_id: 102, student_code: "BIT250002", full_name: "Bùi Anh Tú", cohort: "K4", faculty_id: 1 }, // Hợp lệ (K4 - CNTT)
        { user_id: 103, student_code: "BBA250003", full_name: "Lê Danh Lượng", cohort: "K4", faculty_id: 2 }  // Sai Khoa (Khoa Kinh doanh)
    ],
    // 4. Bảng Vé & Điểm danh: Danh sách vé đã phát hành
    tickets: []
};
// API 1: ĐĂNG KÝ VÉ SỰ KIỆN ([PB-01] & [PB-02])
// POST /api/tickets/register
router.post('/register', async (req, res) => {
    const { event_id, student_id } = req.body;

    try {
        if (!event_id || !student_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Thiếu thông tin mã sự kiện hoặc mã định danh sinh viên." 
            });
        }

        const event = db.events.find(e => e.event_id === Number(event_id));
        const student = db.users.find(u => u.user_id === Number(student_id));

        if (!event || !student) {
            return res.status(404).json({ 
                success: false, 
                message: "Không tìm thấy sự kiện hoặc sinh viên tương ứng." 
            });
        }
        // [PB-01] KIỂM TRA ĐIỀU KIỆN THAM GIA (ELIGIBILITY RULES)
        const rules = db.event_eligibility.filter(r => r.event_id === event.event_id);
        if (rules.length > 0) {
            const isEligible = rules.some(rule => {
                const matchCohort = !rule.cohort || rule.cohort === student.cohort;
                const matchFaculty = !rule.faculty_id || rule.faculty_id === student.faculty_id;
                return matchCohort && matchFaculty;
            });

            if (!isEligible) {
                return res.status(403).json({
                    success: false,
                    test_case: "TC-01 (PB-01)",
                    message: "Từ chối: Bạn không thuộc diện Khóa/Khoa được phép tham gia sự kiện này!"
                });
            }
        }
        // [PB-02] RÀNG BUỘC 1 SINH VIÊN = 1 VÉ DUY NHẤT (UNIQUE uq_event_student)
        const alreadyHasTicket = db.tickets.some(t => 
            t.event_id === event.event_id && 
            t.student_id === student.user_id && 
            t.checkin_status !== 'CANCELLED'
        );

        if (alreadyHasTicket) {
            return res.status(400).json({
                success: false,
                test_case: "TC-02 (PB-02)",
                message: "Từ chối: Bạn đã đăng ký 01 vé cho sự kiện này rồi! Hệ thống không cấp vé thứ 2."
            });
        }
        // [PB-02] KHÓA SỨC CHỨA HỘI TRƯỜNG & CHỐNG OVERBOOKING
        const validTickets = db.tickets.filter(t => 
            t.event_id === event.event_id && 
            t.checkin_status !== 'CANCELLED'
        );

        if (validTickets.length >= event.seat_capacity || event.status === 'FULL') {
            event.status = 'FULL'; // Tự động khóa sự kiện
            return res.status(409).json({
                success: false,
                test_case: "TC-03 (PB-02)",
                message: "Từ chối: Sự kiện đã HẾT CHỖ (Đạt trần sức chứa tối đa)!"
            });
        }
        // CẤP VÉ HỢP LỆ
        const ticketCode = `TK-E${event.event_id}-${student.student_code}`;
        const newTicket = {
            ticket_id: db.tickets.length + 1,
            ticket_code: ticketCode,
            event_id: event.event_id,
            student_id: student.user_id,
            qr_token: `TOKEN_SHA256_${Date.now()}_${student.student_code}`,
            checkin_status: "REGISTERED",
            registered_at: new Date().toISOString()
        };

        db.tickets.push(newTicket);

        // Nếu vừa cấp chiếc vé cuối cùng -> chuyển trạng thái sự kiện sang FULL
        if (db.tickets.filter(t => t.event_id === event.event_id && t.checkin_status !== 'CANCELLED').length >= event.seat_capacity) {
            event.status = 'FULL';
        }

        return res.status(201).json({
            success: true,
            message: "Đăng ký vé tham dự sự kiện thành công.",
            data: newTicket,
            seats_left: event.seat_capacity - db.tickets.filter(t => t.event_id === event.event_id && t.checkin_status !== 'CANCELLED').length
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Lỗi hệ thống khi đăng ký vé: " + error.message 
        });
    }
});
// API 2: HỦY ĐĂNG KÝ VÉ (TỰ ĐỘNG MỞ LẠI SLOT NẾU ĐANG FULL)
// POST /api/tickets/cancel
router.post('/cancel', async (req, res) => {
    const { ticket_id, student_id } = req.body;

    const ticket = db.tickets.find(t => t.ticket_id === Number(ticket_id) && t.student_id === Number(student_id));
    if (!ticket) {
        return res.status(404).json({ success: false, message: "Không tìm thấy vé hợp lệ để hủy." });
    }

    ticket.checkin_status = "CANCELLED";
    // Tự động mở lại trạng thái sự kiện nếu trước đó bị FULL
    const event = db.events.find(e => e.event_id === ticket.event_id);
    const validTickets = db.tickets.filter(t => t.event_id === event.event_id && t.checkin_status !== 'CANCELLED');
    if (validTickets.length < event.seat_capacity) {
        event.status = "OPEN";
    }

    return res.status(200).json({
        success: true,
        message: "Hủy vé thành công, vị trí đã được giải phóng.",
        ticket_id: ticket.ticket_id,
        checkin_status: "CANCELLED",
        event_status_now: event.status
    });
});

module.exports = router;
// API: Quét QR Điểm danh tại cửa (Staff)
router.post('/checkin', async (req, res) => {
    const { qr_token } = req.body;
    
    // 1. Tìm vé theo token hoặc mã vé
    const ticket = db.tickets.find(t => t.qr_token === qr_token || t.ticket_code === qr_token);
    if (!ticket) {
        return res.status(404).json({ success: false, message: "Mã vé không tồn tại trên hệ thống!" });
    }

    // 2. Chặn quét trùng lặp (Anti-duplicate)
    if (ticket.checkin_status === 'CHECKED_IN') {
        return res.status(400).json({ 
            success: false, 
            message: `CẢNH BÁO: Vé này đã được điểm danh vào lúc ${ticket.checkin_time}!` 
        });
    }

    // 3. Điểm danh thành công
    ticket.checkin_status = 'CHECKED_IN';
    ticket.checkin_time = new Date().toLocaleTimeString('vi-VN');
    
    const student = db.students.find(s => s.student_id === ticket.student_id);
    return res.status(200).json({
        success: true,
        message: "Điểm danh thành công!",
        data: {
            student_name: student ? student.full_name : "Sinh viên",
            student_code: student ? student.student_code : ticket.student_id,
            checkin_time: ticket.checkin_time
        }
    });
});