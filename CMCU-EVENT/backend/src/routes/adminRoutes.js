const express = require('express');
const router = express.Router();
const db = require('../config/db');

function httpError(status, message, code) {
  const err = new Error(message);
  err.statusCode = status;
  if (code) err.code = code;
  return err;
}

// Thêm async vì có gọi DB
async function requireAdminOrStaff(userId) {
  if (!userId) throw httpError(400, 'Thiếu admin_user_id', 'MISSING_USER_ID');
  const u = await db.findById('users', userId); // Thêm await
  if (!u) throw httpError(404, `Không tìm thấy user #${userId}`, 'USER_NOT_FOUND');
  if (!['ADMIN', 'STAFF'].includes(u.system_role)) {
    throw httpError(403, 'Chỉ ADMIN hoặc STAFF mới được dùng API này', 'NOT_AUTHORIZED');
  }
  return u;
}

function formatVnTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

router.post('/events', async (req, res, next) => { // Thêm async
  try {
    const { admin_user_id, title, description, location, start_time, end_time, seat_capacity, cancel_deadline_hours = 24, eligibility = [] } = req.body || {};
    await requireAdminOrStaff(admin_user_id);

    if (!title || !start_time || !end_time || !seat_capacity) throw httpError(400, 'Thiếu thông tin bắt buộc', 'MISSING_FIELDS');
    if (Number(seat_capacity) <= 0) throw httpError(400, 'seat_capacity phải > 0', 'INVALID_CAPACITY');
    if (new Date(end_time) <= new Date(start_time)) throw httpError(400, 'end_time phải sau start_time', 'INVALID_TIME_RANGE');
        // Đã xóa đoạn kiểm tra bắt buộc phải có eligibility. 
    // Nếu mảng rỗng [] tức là mở cho toàn trường.
    if (!Array.isArray(eligibility)) {
      throw httpError(400, 'eligibility phải là mảng', 'INVALID_ELIGIBILITY');
    }
    
    for (const el of eligibility) {
      if (!el.cohort || !['K1', 'K2', 'K3', 'K4'].includes(el.cohort)) throw httpError(400, `cohort không hợp lệ`, 'INVALID_COHORT');
      const fac = await db.findById('faculties', el.faculty_id); // Thêm await
      if (!fac) throw httpError(400, `faculty_id không tồn tại`, 'INVALID_FACULTY');
    }

    // Sửa định dạng ngày tháng khi đưa vào SQL Server
    const event = await db.insert('events', { // Thêm await
      title, description: description || null, location: location || 'Chưa xác định',
      start_time: new Date(start_time), end_time: new Date(end_time), 
      seat_capacity: Number(seat_capacity), cancel_deadline_hours: Number(cancel_deadline_hours),
      status: 'OPEN', created_by: Number(admin_user_id),
    });

    const eligibilityRows = [];
    for (const el of eligibility) {
        const row = await db.insert('event_eligibility', { // Thêm await
          event_id: event.event_id, cohort: el.cohort, faculty_id: Number(el.faculty_id),
        });
        eligibilityRows.push(row);
    }

    res.status(201).json({ success: true, message: 'Tạo sự kiện thành công', data: { ...event, eligibility: eligibilityRows } });
  } catch (err) { next(err); }
});

router.get('/events/:id/export', async (req, res, next) => { // Thêm async
  try {
    await requireAdminOrStaff(req.query.admin_user_id);
    const eventId = Number(req.params.id);
    const event = await db.findById('events', eventId); // Thêm await
    if (!event) throw httpError(404, `Không tìm thấy sự kiện`, 'EVENT_NOT_FOUND');

    const tickets = await db.findWhere('tickets', t => t.event_id === eventId && t.checkin_status === 'CHECKED_IN'); // Thêm await

    const rows = [];
    for (let i = 0; i < tickets.length; i++) {
        const t = tickets[i];
        const stu = await db.findById('users', t.student_id); // Thêm await
        const fac = stu ? await db.findById('faculties', stu.faculty_id) : null; // Thêm await
        const checker = t.checked_by ? await db.findById('users', t.checked_by) : null; // Thêm await
        
        rows.push({
            stt: i + 1, student_code: stu?.student_code || '', full_name: stu?.full_name || '',
            cohort: stu?.cohort || '', class_name: stu?.class_name || '', faculty_name: fac?.faculty_name || '',
            ticket_code: t.ticket_code, checkin_time_vn: formatVnTime(t.checkin_time), checked_by: checker?.full_name || '',
        });
    }

    const BOM = '\uFEFF';
    const header = ['STT', 'Mã SV', 'Họ và tên', 'Khoá', 'Lớp', 'Khoa', 'Mã vé', 'Thời gian điểm danh', 'Người điểm danh'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const cells = [r.stt, r.student_code, r.full_name, r.cohort, r.class_name, r.faculty_name, r.ticket_code, r.checkin_time_vn, r.checked_by].map(v => {
        const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      });
      lines.push(cells.join(','));
    }
    const csv = BOM + lines.join('\r\n');
    const safeTitle = event.title.replace(/[^\w]/g, '_').replace(/_+/g, '_').substring(0, 30);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="diemdanh_event${eventId}_${safeTitle}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

router.get('/tasks', async (req, res, next) => { // Thêm async
  try {
    await requireAdminOrStaff(req.query.admin_user_id);
    let tasks = await db.getAll('staff_tasks'); // Thêm await
    
    if (req.query.event_id) {
      tasks = tasks.filter(t => t.event_id === Number(req.query.event_id));
    }

    const enriched = [];
    for (const t of tasks) {
        const assignee = t.assignee_id ? await db.findById('users', t.assignee_id) : null; // Thêm await
        const ev = await db.findById('events', t.event_id); // Thêm await
        enriched.push({ ...t, assignee_name: assignee?.full_name || null, event_title: ev?.title || null });
    }

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) { next(err); }
});

router.post('/tasks', async (req, res, next) => { // Thêm async
  try {
    const { admin_user_id, event_id, title, deadline, assignee_id, note } = req.body || {};
    await requireAdminOrStaff(admin_user_id);

    if (!event_id || !title) throw httpError(400, 'Thiếu event_id hoặc title', 'MISSING_FIELDS');
    if (!await db.findById('events', event_id)) throw httpError(404, `Không tìm thấy sự kiện`, 'EVENT_NOT_FOUND');
    if (assignee_id && !await db.findById('users', assignee_id)) throw httpError(404, `Không tìm thấy assignee`, 'ASSIGNEE_NOT_FOUND');

    const task = await db.insert('staff_tasks', { // Thêm await
      event_id: Number(event_id), title, 
      deadline: deadline ? new Date(deadline) : null, 
      assignee_id: assignee_id ? Number(assignee_id) : null, 
      status: 'TODO', note: note || null,
    });

    res.status(201).json({ success: true, message: 'Tạo task thành công', data: task });
  } catch (err) { next(err); }
});

router.patch('/tasks/:id', async (req, res, next) => { // Thêm async
  try {
    const { admin_user_id, status, note, assignee_id } = req.body || {};
    await requireAdminOrStaff(admin_user_id);

    const taskId = Number(req.params.id);
    const task = await db.findById('staff_tasks', taskId); // Thêm await
    if (!task) throw httpError(404, `Không tìm thấy task`, 'TASK_NOT_FOUND');

    const patch = {};
    if (status) {
      if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) throw httpError(400, `status không hợp lệ`, 'INVALID_STATUS');
      patch.status = status;
    }
    if (note !== undefined) patch.note = note;
    if (assignee_id !== undefined) {
      if (assignee_id && !await db.findById('users', assignee_id)) throw httpError(404, `Không tìm thấy assignee`, 'ASSIGNEE_NOT_FOUND');
      patch.assignee_id = assignee_id;
    }
    if (Object.keys(patch).length === 0) throw httpError(400, 'Không có field nào cần cập nhật', 'NO_FIELDS');

    const updated = await db.update('staff_tasks', taskId, patch); // Thêm await
    res.json({ success: true, message: 'Cập nhật task thành công', data: updated });
  } catch (err) { next(err); }
});

module.exports = router;