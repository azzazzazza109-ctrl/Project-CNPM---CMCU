/* =============================================================
   src/routes/adminRoutes.js
   API Quản trị BTC — Bước 4
   -------------------------------------------------------------
   • POST   /api/admin/events              — tạo sự kiện + eligibility
   • GET    /api/admin/events/:id/export   — xuất CSV chuẩn Phòng CTSV
   • GET    /api/admin/tasks               — list tasks (filter event_id)
   • POST   /api/admin/tasks               — tạo task hậu cần
   • PATCH  /api/admin/tasks/:id           — đổi status (TODO → IN_PROGRESS → DONE)
   ============================================================= */
const express = require('express');
const router = express.Router();
const db = require('../config/db');

/* Helper tạo lỗi */
function httpError(status, message, code) {
  const err = new Error(message);
  err.statusCode = status;
  if (code) err.code = code;
  return err;
}

/* Xác thực user là ADMIN hoặc STAFF */
function requireAdminOrStaff(userId) {
  if (!userId) throw httpError(400, 'Thiếu admin_user_id', 'MISSING_USER_ID');
  const u = db.findById('users', userId);
  if (!u) throw httpError(404, `Không tìm thấy user #${userId}`, 'USER_NOT_FOUND');
  if (!['ADMIN', 'STAFF'].includes(u.system_role)) {
    throw httpError(403, 'Chỉ ADMIN hoặc STAFF mới được dùng API này', 'NOT_AUTHORIZED');
  }
  return u;
}

/* Định dạng giờ VN */
function formatVnTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/* =============================================================
   POST /api/admin/events — Tạo sự kiện kèm eligibility
   Body: {
     admin_user_id, title, description?, location?,
     start_time, end_time, seat_capacity, cancel_deadline_hours?,
     eligibility: [ { cohort, faculty_id }, ... ]
   }
   ============================================================= */
router.post('/events', (req, res, next) => {
  try {
    const {
      admin_user_id, title, description, location,
      start_time, end_time, seat_capacity,
      cancel_deadline_hours = 24, eligibility = [],
    } = req.body || {};

    requireAdminOrStaff(admin_user_id);

    /* Validation */
    if (!title || !start_time || !end_time || !seat_capacity) {
      throw httpError(400, 'Thiếu title / start_time / end_time / seat_capacity',
        'MISSING_FIELDS');
    }
    if (Number(seat_capacity) <= 0) {
      throw httpError(400, 'seat_capacity phải > 0', 'INVALID_CAPACITY');
    }
    if (new Date(end_time) <= new Date(start_time)) {
      throw httpError(400, 'end_time phải sau start_time', 'INVALID_TIME_RANGE');
    }
    if (!Array.isArray(eligibility) || eligibility.length === 0) {
      throw httpError(400, 'Phải có ít nhất 1 eligibility { cohort, faculty_id }',
        'MISSING_ELIGIBILITY');
    }
    for (const el of eligibility) {
      if (!el.cohort || !['K1', 'K2', 'K3', 'K4'].includes(el.cohort)) {
        throw httpError(400, `cohort không hợp lệ: ${el.cohort}`, 'INVALID_COHORT');
      }
      if (!db.findById('faculties', el.faculty_id)) {
        throw httpError(400, `faculty_id không tồn tại: ${el.faculty_id}`, 'INVALID_FACULTY');
      }
    }

    /* Insert event */
    const event = db.insert('events', {
      title,
      description: description || null,
      location: location || 'Chưa xác định',
      start_time, end_time,
      seat_capacity: Number(seat_capacity),
      cancel_deadline_hours: Number(cancel_deadline_hours),
      status: 'OPEN',
      created_by: Number(admin_user_id),
    });

    /* Insert eligibility */
    const eligibilityRows = eligibility.map(el => db.insert('event_eligibility', {
      event_id: event.event_id,
      cohort: el.cohort,
      faculty_id: Number(el.faculty_id),
    }));

    res.status(201).json({
      success: true,
      message: 'Tạo sự kiện thành công',
      data: {
        event_id: event.event_id,
        title: event.title,
        location: event.location,
        start_time: event.start_time,
        end_time: event.end_time,
        seat_capacity: event.seat_capacity,
        cancel_deadline_hours: event.cancel_deadline_hours,
        status: event.status,
        eligibility: eligibilityRows.map(e => {
          const fac = db.findById('faculties', e.faculty_id);
          return {
            eligibility_id: e.eligibility_id,
            cohort: e.cohort,
            faculty_id: e.faculty_id,
            faculty_name: fac?.faculty_name || null,
          };
        }),
      },
    });
  } catch (err) { next(err); }
});

/* =============================================================
   GET /api/admin/events/:id/export
   Xuất CSV sinh viên đã CHECKED_IN — chuẩn nộp Phòng CTSV
   Query: ?admin_user_id=5
   ============================================================= */
router.get('/events/:id/export', (req, res, next) => {
  try {
    requireAdminOrStaff(req.query.admin_user_id);

    const eventId = Number(req.params.id);
    const event = db.findById('events', eventId);
    if (!event) {
      throw httpError(404, `Không tìm thấy sự kiện #${eventId}`, 'EVENT_NOT_FOUND');
    }

    /* JOIN tickets + users + faculties — lọc CHECKED_IN */
    const tickets = db.findWhere(
      'tickets',
      t => t.event_id === eventId && t.checkin_status === 'CHECKED_IN'
    );

    const rows = tickets.map((t, idx) => {
      const stu = db.findById('users', t.student_id);
      const fac = stu ? db.findById('faculties', stu.faculty_id) : null;
      const checker = t.checked_by ? db.findById('users', t.checked_by) : null;
      return {
        stt: idx + 1,
        student_code: stu?.student_code || '',
        full_name: stu?.full_name || '',
        cohort: stu?.cohort || '',
        class_name: stu?.class_name || '',
        faculty_name: fac?.faculty_name || '',
        ticket_code: t.ticket_code,
        checkin_time_vn: formatVnTime(t.checkin_time),
        checked_by: checker?.full_name || '',
      };
    });

    /* Sinh CSV — có BOM để Excel đọc UTF-8 tiếng Việt đúng */
    const BOM = '\uFEFF';
    const header = ['STT', 'Mã SV', 'Họ và tên', 'Khoá', 'Lớp', 'Khoa',
                    'Mã vé', 'Thời gian điểm danh', 'Người điểm danh'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const cells = [
        r.stt, r.student_code, r.full_name, r.cohort, r.class_name,
        r.faculty_name, r.ticket_code, r.checkin_time_vn, r.checked_by,
      ].map(v => {
        const s = String(v ?? '');
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      });
      lines.push(cells.join(','));
    }
    const csv = BOM + lines.join('\r\n');

    /* Tên file an toàn */
    const safeTitle = event.title
      .replace(/[^\w]/g, '_').replace(/_+/g, '_').substring(0, 30);
    const filename = `diemdanh_event${eventId}_${safeTitle}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { next(err); }
});

/* =============================================================
   GET /api/admin/tasks?event_id=X&admin_user_id=Y
   ============================================================= */
router.get('/tasks', (req, res, next) => {
  try {
    requireAdminOrStaff(req.query.admin_user_id);

    let tasks = db.getAll('staff_tasks');
    if (req.query.event_id) {
      tasks = tasks.filter(t => t.event_id === Number(req.query.event_id));
    }

    const enriched = tasks.map(t => {
      const assignee = t.assignee_id ? db.findById('users', t.assignee_id) : null;
      const ev = db.findById('events', t.event_id);
      return {
        ...t,
        assignee_name: assignee?.full_name || null,
        event_title: ev?.title || null,
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) { next(err); }
});

/* =============================================================
   POST /api/admin/tasks — Tạo task hậu cần
   Body: { admin_user_id, event_id, title, deadline?, assignee_id?, note? }
   ============================================================= */
router.post('/tasks', (req, res, next) => {
  try {
    const { admin_user_id, event_id, title, deadline, assignee_id, note } = req.body || {};
    requireAdminOrStaff(admin_user_id);

    if (!event_id || !title) {
      throw httpError(400, 'Thiếu event_id hoặc title', 'MISSING_FIELDS');
    }
    if (!db.findById('events', event_id)) {
      throw httpError(404, `Không tìm thấy sự kiện #${event_id}`, 'EVENT_NOT_FOUND');
    }
    if (assignee_id && !db.findById('users', assignee_id)) {
      throw httpError(404, `Không tìm thấy assignee #${assignee_id}`, 'ASSIGNEE_NOT_FOUND');
    }

    const task = db.insert('staff_tasks', {
      event_id: Number(event_id),
      title,
      deadline: deadline || null,
      assignee_id: assignee_id ? Number(assignee_id) : null,
      status: 'TODO',
      note: note || null,
    });

    res.status(201).json({ success: true, message: 'Tạo task thành công', data: task });
  } catch (err) { next(err); }
});

/* =============================================================
   PATCH /api/admin/tasks/:id — Đổi status / ghi chú
   Body: { admin_user_id, status?, note?, assignee_id? }
   ============================================================= */
router.patch('/tasks/:id', (req, res, next) => {
  try {
    const { admin_user_id, status, note, assignee_id } = req.body || {};
    requireAdminOrStaff(admin_user_id);

    const taskId = Number(req.params.id);
    const task = db.findById('staff_tasks', taskId);
    if (!task) {
      throw httpError(404, `Không tìm thấy task #${taskId}`, 'TASK_NOT_FOUND');
    }

    const patch = {};
    if (status) {
      if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        throw httpError(400, `status không hợp lệ: ${status}`, 'INVALID_STATUS');
      }
      patch.status = status;
    }
    if (note !== undefined) patch.note = note;
    if (assignee_id !== undefined) {
      if (assignee_id && !db.findById('users', assignee_id)) {
        throw httpError(404, `Không tìm thấy assignee #${assignee_id}`, 'ASSIGNEE_NOT_FOUND');
      }
      patch.assignee_id = assignee_id;
    }

    if (Object.keys(patch).length === 0) {
      throw httpError(400, 'Không có field nào cần cập nhật', 'NO_FIELDS');
    }

    const updated = db.update('staff_tasks', taskId, patch);
    res.json({ success: true, message: 'Cập nhật task thành công', data: updated });
  } catch (err) { next(err); }
});

module.exports = router;