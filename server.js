const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// === DỮ LIỆU MẪU (DATABASE GIẢ LẬP TRONG BỘ NHỚ) ===
let db = {
    users: [
        { id: 1, student_code: "SV001", full_name: "Nguyễn Văn Long", cohort: "K3", faculty: "CNTT" },
        { id: 2, student_code: "SV002", full_name: "Trần Thị Lâm", cohort: "K4", faculty: "Kinh tế" }
    ],
    events: [
        { id: 1, title: "Hội thảo Công nghệ AI 2026", capacity: 2, registered_count: 0, required_cohort: "K3", required_faculty: "CNTT" }
    ],
    tickets: [] // Lưu vé: { ticket_id, event_id, student_id, qr_code, status: 'REGISTERED' }
};

// 1. API Lấy danh sách sự kiện
app.get('/api/events', (req, res) => {
    res.json(db.events);
});

// 2. API Đăng ký vé sự kiện (Có kiểm tra điều kiện Khoa/Khóa & Sức chứa)
app.post('/api/tickets/register', async (req, res) => {
    const { student_id, event_id } = req.body;
    
    const student = db.users.find(u => u.id === student_id);
    const event = db.events.find(e => e.id === event_id);

    if (!student || !event) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu!" });

    // Kiểm tra điều kiện Khóa / Khoa
    if (event.required_cohort && student.cohort !== event.required_cohort) {
        return res.status(400).json({ success: false, message: `Sự kiện chỉ dành cho sinh viên khóa ${event.required_cohort}` });
    }

    // Kiểm tra đã đăng ký chưa
    const existingTicket = db.tickets.find(t => t.event_id === event_id && t.student_id === student_id);
    if (existingTicket) {
        return res.status(400).json({ success: false, message: "Bạn đã đăng ký vé cho sự kiện này rồi!" });
    }

    // Kiểm tra sức chứa (Capacity)
    if (event.registered_count >= event.capacity) {
        return res.status(400).json({ success: false, message: "Sự kiện đã hết chỗ ngồi!" });
    }

    // Sinh mã QR token độc nhất
    const qrData = `CMCU-EVT-${event_id}-SV-${student.student_id}-${Date.now()}`;
    const qrImage = await qrcode.toDataURL(qrData);

    // Lưu vé
    const newTicket = {
        ticket_id: db.tickets.length + 1,
        event_id,
        student_id,
        ticket_code: qrData,
        qr_image: qrImage,
        status: 'REGISTERED', // REGISTERED hoặc CHECKED_IN
        checkin_time: null
    };

    db.tickets.push(newTicket);
    event.registered_count += 1;

    res.json({ success: true, message: "Đăng ký vé thành công!", ticket: newTicket });
});

// 3. API Quét mã QR Check-in (Chống quét trùng lặp)
app.post('/api/checkin', (req, res) => {
    const { ticket_code } = req.body;
    const ticket = db.tickets.find(t => t.ticket_code === ticket_code);

    if (!ticket) {
        return res.status(404).json({ success: false, message: "Mã vé không hợp lệ hoặc không tồn tại!" });
    }

    if (ticket.status === 'CHECKED_IN') {
        return res.status(400).json({ 
            success: false, 
            message: `CẢNH BÁO: Vé này đã được sử dụng lúc ${ticket.checkin_time}!` 
        });
    }

    // Cập nhật trạng thái đã vào cửa
    ticket.status = 'CHECKED_IN';
    ticket.checkin_time = new Date().toLocaleTimeString();

    const student = db.users.find(u => u.id === ticket.student_id);
    res.json({ success: true, message: `Check-in thành công cho sinh viên: ${student.full_name} (${student.student_code})` });
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});