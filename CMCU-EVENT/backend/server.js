const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'CMCU-MOCK-SECRET-KEY';

// ==========================================
// 1. "DATABASE ẢO" (MOCK DATA)
// ==========================================
const mockUsers = [
    { user_id: 1, username: 'admin', password: '123456', full_name: 'Trần Duy Long', system_role: 'ADMIN' },
    { user_id: 2, username: 'sinhvien1', password: '123456', full_name: 'Nguyễn Nhi', system_role: 'STUDENT', student_code: 'BIT250001', class_name: 'CNTT-K3' },
    { user_id: 3, username: 'staff1', password: '123456', full_name: 'Trần Lâm', system_role: 'STAFF' }
];

let mockEvents = [
    { event_id: 1, title: "Hội thảo Công nghệ AI & Tương lai", description: "Sự kiện chia sẻ về xu hướng AI mới nhất.", location: "Hội trường A, CMCU", start_time: "2026-11-15T08:00:00.000Z", end_time: "2026-11-15T11:30:00.000Z", seat_capacity: 200, status: "OPEN", cancel_deadline_hours: 24, eligibility: [] },
    { event_id: 2, title: "Cuộc thi Lập trình CMCU CodeFest 2026", description: "Sân chơi bổ ích cho sinh viên đam mê IT.", location: "Phòng Lab 3, Tòa nhà B", start_time: "2026-12-01T13:00:00.000Z", end_time: "2026-12-01T17:00:00.000Z", seat_capacity: 50, status: "OPEN", cancel_deadline_hours: 12, eligibility: [] },
    { event_id: 3, title: "Ngày hội Hiến máu nhân đạo 2026", description: "Một giọt máu cho đi, một cuộc đời ở lại. Hãy chung tay vì cộng đồng.", location: "Sân trường CMCU", start_time: "2026-11-20T07:30:00.000Z", end_time: "2026-11-20T16:00:00.000Z", seat_capacity: 500, status: "OPEN", cancel_deadline_hours: 48, eligibility: [] },
    { event_id: 4, title: "Chung kết Cuộc thi English Speaking Contest", description: "Nơi tranh tài của những sinh viên xuất sắc nhất trong khả năng thuyết trình tiếng Anh.", location: "Hội trường lớn CMCU", start_time: "2026-11-25T18:00:00.000Z", end_time: "2026-11-25T21:00:00.000Z", seat_capacity: 300, status: "OPEN", cancel_deadline_hours: 24, eligibility: [] },
    { event_id: 5, title: "Workshop: Kỹ năng viết CV & Phỏng vấn", description: "Chuẩn bị hành trang vững chắc trước khi bước vào thị trường lao động cùng các chuyên gia nhân sự.", location: "Phòng 402, Tòa nhà C", start_time: "2026-12-05T09:00:00.000Z", end_time: "2026-12-05T11:30:00.000Z", seat_capacity: 100, status: "OPEN", cancel_deadline_hours: 24, eligibility: [] },
    { event_id: 6, title: "Đêm nhạc Acoustic 'Giai điệu mùa thu'", description: "Đêm nhạc thư giãn với những bản tình ca nhẹ nhàng, giúp xua tan căng thẳng sau giờ học.", location: "Khuôn viên CMCU", start_time: "2026-12-10T19:30:00.000Z", end_time: "2026-12-10T22:00:00.000Z", seat_capacity: 400, status: "OPEN", cancel_deadline_hours: 12, eligibility: [] }
];

let mockTickets = [
    { ticket_id: 1, event_id: 1, student_id: 2, ticket_code: 'TK-E1-BIT250001', qr_token: 'MOCK-QR-TEST-1', status: 'REGISTERED', created_at: new Date().toISOString() },
    { ticket_id: 2, event_id: 2, student_id: 2, ticket_code: 'TK-E2-BIT250001', qr_token: 'MOCK-QR-TEST-2', status: 'CANCELLED', created_at: new Date(Date.now() - 86400000).toISOString() }
];
let ticketIdCounter = 3;

let mockTasks = [
    { task_id: 1, event_id: 1, title: "Chuẩn bị nước uống và backdrop", deadline: "2026-11-14T10:00:00.000Z", assignee_id: 3, status: "TODO", note: "Liên hệ phòng CTSV" }
];
let taskIdCounter = 2;

// Middleware xác thực Token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(403).json({ success: false, message: 'Token hết hạn.' });
    }
};

const requireStaff = (req, res, next) => {
    if (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Chỉ Nhân viên mới được dùng chức năng này.' });
    }
    next();
};

// ==========================================
// 2. HEALTH CHECK
// ==========================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend đang chạy hoàn hảo!' });
});

// ==========================================
// 3. API ĐĂNG NHẬP
// ==========================================
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = mockUsers.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
    }

    const token = jwt.sign({ user_id: user.user_id, role: user.system_role }, JWT_SECRET, { expiresIn: '1d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, token, user: userWithoutPassword });
});

// ==========================================
// 4. API SỰ KIỆN (EVENTS)
// ==========================================
app.get('/api/events', (req, res) => {
    res.json({ success: true, data: mockEvents });
});

app.post('/api/admin/events', verifyToken, (req, res) => {
    const { title, description, location, start_time, end_time, seat_capacity, eligibility } = req.body;
    const newEvent = {
        event_id: mockEvents.length + 1,
        title, description, location, start_time, end_time,
        seat_capacity: Number(seat_capacity),
        status: 'OPEN',
        cancel_deadline_hours: 24,
        eligibility: eligibility || []
    };
    mockEvents.push(newEvent);
    res.status(201).json({ success: true, message: 'Tạo sự kiện thành công', data: newEvent });
});

app.put('/api/admin/events/:id', verifyToken, (req, res) => {
    const eventId = Number(req.params.id);
    const eventIndex = mockEvents.findIndex(e => e.event_id === eventId);
    
    if (eventIndex === -1) {
        return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại' });
    }

    const { title, description, location, start_time, end_time, seat_capacity, cancel_deadline_hours, status, eligibility } = req.body;

    mockEvents[eventIndex] = {
        ...mockEvents[eventIndex],
        title: title !== undefined ? title : mockEvents[eventIndex].title,
        description: description !== undefined ? description : mockEvents[eventIndex].description,
        location: location !== undefined ? location : mockEvents[eventIndex].location,
        start_time: start_time !== undefined ? start_time : mockEvents[eventIndex].start_time,
        end_time: end_time !== undefined ? end_time : mockEvents[eventIndex].end_time,
        seat_capacity: seat_capacity !== undefined ? Number(seat_capacity) : mockEvents[eventIndex].seat_capacity,
        cancel_deadline_hours: cancel_deadline_hours !== undefined ? Number(cancel_deadline_hours) : mockEvents[eventIndex].cancel_deadline_hours,
        status: status !== undefined ? status : mockEvents[eventIndex].status,
        eligibility: eligibility !== undefined ? eligibility : mockEvents[eventIndex].eligibility
    };

    res.json({ success: true, message: 'Cập nhật sự kiện thành công', data: mockEvents[eventIndex] });
});

app.delete('/api/admin/events/:id', verifyToken, (req, res) => {
    const eventId = Number(req.params.id);
    const eventIndex = mockEvents.findIndex(e => e.event_id === eventId);

    if (eventIndex === -1) {
        return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại' });
    }

    mockEvents.splice(eventIndex, 1);
    mockTickets = mockTickets.filter(t => t.event_id !== eventId);
    mockTasks = mockTasks.filter(t => t.event_id !== eventId);

    res.json({ success: true, message: 'Xóa sự kiện thành công.' });
});

// ==========================================
// 5. API VÉ (TICKETS)
// ==========================================
app.post('/api/tickets/register', verifyToken, (req, res) => {
    const { event_id } = req.body;
    const student_id = req.user.user_id;

    const event = mockEvents.find(e => e.event_id === Number(event_id));
    if (!event) return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại' });

    const existing = mockTickets.find(t => t.event_id === Number(event_id) && t.student_id === student_id && t.status === 'REGISTERED');
    if (existing) return res.status(400).json({ success: false, message: 'Bạn đã đăng ký sự kiện này rồi.' });

    const userInfo = mockUsers.find(u => u.user_id === student_id);
    const newTicket = {
        ticket_id: ticketIdCounter++,
        event_id: Number(event_id),
        student_id: student_id,
        ticket_code: `TK-E${event_id}-${userInfo.student_code || 'SV'}`,
        qr_token: `MOCK-QR-${Date.now()}-${Math.random()}`,
        status: 'REGISTERED',
        created_at: new Date().toISOString()
    };
    mockTickets.push(newTicket);

    res.status(201).json({ success: true, message: 'Đăng ký thành công!', data: newTicket });
});

app.get('/api/tickets/my-tickets', verifyToken, (req, res) => {
    const student_id = req.user.user_id;
    const userInfo = mockUsers.find(u => u.user_id === student_id);
    
    const myTickets = mockTickets
        .filter(t => t.student_id === student_id)
        .map(ticket => {
            const event = mockEvents.find(e => e.event_id === ticket.event_id);
            return {
                ...ticket,
                student_name: userInfo?.full_name,
                student_code: userInfo?.student_code,
                title: event?.title || 'Sự kiện không xác định',
                location: event?.location || '',
                start_time: event?.start_time || '',
                end_time: event?.end_time || '',
                cancel_deadline_hours: event?.cancel_deadline_hours || 24
            };
        });

    res.json({ success: true, data: myTickets });
});

app.post('/api/tickets/cancel/:id', verifyToken, (req, res) => {
    const ticketId = Number(req.params.id);
    const ticket = mockTickets.find(t => t.ticket_id === ticketId && t.student_id === req.user.user_id);
    
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy vé.' });
    if (ticket.status !== 'REGISTERED') return res.status(400).json({ success: false, message: 'Vé không ở trạng thái có thể hủy.' });

    const event = mockEvents.find(e => e.event_id === ticket.event_id);
    
    if (event) {
        const startTime = new Date(event.start_time);
        const deadlineTime = new Date(startTime.getTime() - (event.cancel_deadline_hours * 60 * 60 * 1000));
        const now = new Date();

        if (now > deadlineTime) {
            return res.status(400).json({ success: false, message: `Đã hết hạn hủy vé quy định (phải hủy trước ${event.cancel_deadline_hours} giờ).` });
        }
    }

    ticket.status = 'CANCELLED';
    res.json({ success: true, message: 'Hủy vé thành công. Chỗ ngồi đã được giải phóng.' });
});

// ==========================================
// 6. API STAFF (CHECK-IN)
// ==========================================

// ✅ THÊM MỚI: API Tra cứu thông tin vé bằng Mã SV (Không điểm danh)
app.get('/api/staff/tickets/search', verifyToken, requireStaff, (req, res) => {
    const { student_code, event_id } = req.query;
    const user = mockUsers.find(u => u.student_code === student_code);
    
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên với mã này.' });
    
    const ticket = mockTickets.find(t => t.student_id === user.user_id && t.event_id === Number(event_id));
    
    if (!ticket) return res.status(404).json({ success: false, message: 'Sinh viên chưa đăng ký sự kiện này.' });
    
    res.json({ 
        success: true, 
        data: {
            full_name: user.full_name,
            student_code: user.student_code,
            class_name: user.class_name,
            status: ticket.status,
            checkin_time: ticket.checkin_time
        } 
    });
});

app.post('/api/staff/checkin/qr', verifyToken, requireStaff, (req, res) => {
    const { qr_token } = req.body;
    const ticket = mockTickets.find(t => t.qr_token === qr_token);

    if (!ticket) return res.status(404).json({ success: false, message: 'Mã vé không hợp lệ.' });
    if (ticket.status === 'CHECKED_IN') return res.status(400).json({ success: false, message: 'Vé đã được sử dụng!' });
    if (ticket.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Vé này đã bị hủy.' });

    const user = mockUsers.find(u => u.user_id === ticket.student_id);
    ticket.status = 'CHECKED_IN';
    ticket.checkin_time = new Date().toISOString();
    
    res.json({ success: true, message: 'Check-in thành công!', data: { full_name: user.full_name, student_code: user.student_code } });
});

app.post('/api/staff/checkin/manual', verifyToken, requireStaff, (req, res) => {
    const { student_code, event_id } = req.body;
    const user = mockUsers.find(u => u.student_code === student_code);

    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên.' });

    const ticket = mockTickets.find(t => t.student_id === user.user_id && t.event_id === Number(event_id));
    
    if (!ticket) return res.status(404).json({ success: false, message: 'Sinh viên chưa đăng ký sự kiện này.' });
    if (ticket.status === 'CHECKED_IN') return res.status(400).json({ success: false, message: 'Sinh viên đã check-in rồi.' });
    if (ticket.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Vé đã bị hủy.' });

    ticket.status = 'CHECKED_IN';
    ticket.checkin_time = new Date().toISOString();

    res.json({ success: true, message: 'Điểm danh thành công!', data: { full_name: user.full_name, student_code: user.student_code } });
});

// ==========================================
// 7. API QUẢN LÝ CÔNG VIỆC (TASKS)
// ==========================================
app.get('/api/admin/tasks', verifyToken, (req, res) => {
    let tasks = mockTasks;
    if (req.query.event_id) {
        tasks = tasks.filter(t => t.event_id === Number(req.query.event_id));
    }
    res.json({ success: true, count: tasks.length, data: tasks });
});

app.post('/api/admin/tasks', verifyToken, (req, res) => {
    const { event_id, title, deadline, assignee_id, note } = req.body;
    
    if (!event_id || !title) {
        return res.status(400).json({ success: false, message: 'Thiếu event_id hoặc title' });
    }

    const newTask = {
        task_id: taskIdCounter++,
        event_id: Number(event_id),
        title,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        assignee_id: assignee_id ? Number(assignee_id) : null,
        status: 'TODO',
        note: note || null
    };

    mockTasks.push(newTask);
    res.status(201).json({ success: true, message: 'Tạo task thành công', data: newTask });
});

// ==========================================
// 8. API XUẤT FILE CSV ĐIỂM DANH (Dành cho Admin)
// ==========================================
app.get('/api/admin/events/:id/export', verifyToken, (req, res) => {
    const eventId = Number(req.params.id);
    const event = mockEvents.find(e => e.event_id === eventId);
    
    if (!event) {
        return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại' });
    }

    const checkedInTickets = mockTickets.filter(t => t.event_id === eventId && t.status === 'CHECKED_IN');

    if (checkedInTickets.length === 0) {
        return res.status(400).json({ success: false, message: 'Chưa có sinh viên nào check-in để xuất báo cáo.' });
    }

    let csvContent = '\uFEFF';
    csvContent += 'STT,Mã SV,Họ và tên,Thời gian điểm danh\n';

    checkedInTickets.forEach((ticket, index) => {
        const user = mockUsers.find(u => u.user_id === ticket.student_id);
        const time = new Date(ticket.checkin_time).toLocaleString('vi-VN');
        csvContent += `${index + 1},${user?.student_code || ''},${user?.full_name || ''},${time}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="DiemDanh_SuKien_${eventId}.csv"`);
    
    res.status(200).send(csvContent);
});

// ==========================================
// 9. KHỞI ĐỘNG SERVER
// ==========================================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server Backend (Mock DB) đang chạy tại http://localhost:${PORT}`);
});