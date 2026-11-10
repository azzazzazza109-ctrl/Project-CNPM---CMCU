const express = require('express');
const router = express.Router();
const db = require('../config/db');

function httpError(status, message, code) {
  const err = new Error(message);
  err.statusCode = status;
  if (code) err.code = code;
  return err;
}

async function requireAdminOrStaff(userId) {
  if (!userId) throw httpError(400, 'Thiếu admin_user_id', 'MISSING_USER_ID');
  const u = await db.findById('users', Number(userId));
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

/* =============================================================
   GET /api/admin/events/:id
   Use-Case: Xem chi tiết sự kiện (kèm số chỗ trống & điều kiện)
   ============================================================= */
router.get('/events/:id', async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);
    const event = await db.findById('events', eventId);
    if (!event) throw httpError(404, 'Không tìm thấy sự kiện', 'EVENT_NOT_FOUND');

    const activeTickets = await db.count(
      'tickets',
      t => t.event_id === eventId && t.checkin_status !== 'CANCELLED'
    );
    const eligibility = await db.findWhere('event_eligibility', e => e.event_id === eventId);

    res.json({
      success: true,
      data: {
        ...event,
        registered_count: activeTickets,
        seats_left: Math.max(0, event.seat_capacity - activeTickets),
        eligibility,
      },
    });
  } catch (err) { next(err); }
});

/* =============================================================
   POST /api/admin/events
   Use-Case: Admin tạo sự kiện mới (eligibility = [] là mở toàn trường)
   ============================================================= */
router.post('/events', async (req, res, next) => {
  try {
    const {
      admin_user_id, title, description, location,
      start_time, end_time, seat_capacity, cancel_deadline_hours = 24, eligibility = []
    } = req.body || {};
    await requireAdminOrStaff(admin_user_id);

    if (!title || !start_time || !end_time || !seat_capacity) {
      throw httpError(400, 'Thiếu thông tin bắt buộc', 'MISSING_FIELDS');
    }
    if (Number(seat_capacity) <= 0) {
      throw httpError(400, 'seat_capacity phải > 0', 'INVALID_CAPACITY');
    }
    if (new Date(end_time) <= new Date(start_time)) {
      throw httpError(400, 'end_time phải sau start_time', 'INVALID_TIME_RANGE');
    }
    if (!Array.isArray(eligibility)) {
      throw httpError(400, 'eligibility phải là mảng', 'INVALID_ELIGIBILITY');
    }

    for (const el of eligibility) {
      if (el.cohort && !['K1', 'K2', 'K3', 'K4'].includes(el.cohort)) {
        throw httpError(400, 'cohort không hợp lệ', 'INVALID_COHORT');
      }
      if (el.faculty_id) {
        const fac = await db.findById('faculties', Number(el.faculty_id));
        if (!fac) throw httpError(400, 'faculty_id không tồn tại', 'INVALID_FACULTY');
      }
    }

    const event = await db.insert('events', {
      title,
      description: description || null,
      location: location || 'Chưa xác định',
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      seat_capacity: Number(seat_capacity),
      cancel_deadline_hours: Number(cancel_deadline_hours),
      status: 'OPEN',
      created_by: Number(admin_user_id),
    });

    const eligibilityRows = [];
    for (const el of eligibility) {
      const row = await db.insert('event_eligibility', {
        event_id: event.event_id,
        cohort: el.cohort || null,
        faculty_id: el.faculty_id ? Number(el.faculty_id) : null,
      });
      eligibilityRows.push(row);
    }

    res.status(201).json({
      success: true,
      message: 'Tạo sự kiện thành công',
      data: { ...event, eligibility: eligibilityRows }
    });
  } catch (err) { next(err); }
});

/* =============================================================
   PUT & PATCH /api/admin/events/:id
   Use-Case: Admin sửa sự kiện, thay đổi thời gian, sức chứa, trạng thái
   ============================================================= */
async function handleUpdateEvent(req, res, next) {
  try {
    const {
      admin_user_id, title, description, location,
      start_time, end_time, seat_capacity, cancel_deadline_hours, status, eligibility
    } = req.body || {};
    await requireAdminOrStaff(admin_user_id);

    const eventId = Number(req.params.id);
    const event = await db.findById('events', eventId);
    if (!event) throw httpError(404, 'Không tìm thấy sự kiện', 'EVENT_NOT_FOUND');

    const newStart = start_time ? new Date(start_time) : new Date(event.start_time);
    const newEnd   = end_time ? new Date(end_time) : new Date(event.end_time);
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime()) || newEnd <= newStart) {
      throw httpError(400, 'end_time phải sau start_time', 'INVALID_TIME_RANGE');
    }

    const activeTickets = await db.count(
      'tickets',
      t => t.event_id === eventId && t.checkin_status !== 'CANCELLED'
    );

    const newCapacity = seat_capacity !== undefined ? Number(seat_capacity) : event.seat_capacity;
    if (newCapacity <= 0) {
      throw httpError(400, 'seat_capacity phải > 0', 'INVALID_CAPACITY');
    }
    if (newCapacity < activeTickets) {
      throw httpError(
        400,
        `Không thể giảm sức chứa xuống ${newCapacity} vì đã có ${activeTickets} sinh viên đăng ký vé.`,
        'CAPACITY_BELOW_REGISTERED'
      );
    }

    let nextStatus = status || event.status;
    if (!['OPEN', 'FULL', 'CLOSED'].includes(nextStatus)) {
      throw httpError(400, 'status không hợp lệ', 'INVALID_STATUS');
    }
    if (nextStatus !== 'CLOSED') {
      nextStatus = newCapacity === activeTickets ? 'FULL' : 'OPEN';
    }

    const patch = {
      title: title !== undefined ? title : event.title,
      description: description !== undefined ? description : event.description,
      location: location !== undefined ? location : event.location,
      start_time: newStart,
      end_time: newEnd,
      seat_capacity: newCapacity,
      cancel_deadline_hours: cancel_deadline_hours !== undefined ? Number(cancel_deadline_hours) : event.cancel_deadline_hours,
      status: nextStatus,
    };

    const updatedEvent = await db.update('events', eventId, patch);

    let updatedEligibility = await db.findWhere('event_eligibility', e => e.event_id === eventId);
    if (Array.isArray(eligibility)) {
      await db.executeQuery('DELETE FROM event_eligibility WHERE event_id = @p0', [eventId]);
      updatedEligibility = [];
      for (const el of eligibility) {
        const row = await db.insert('event_eligibility', {
          event_id: eventId,
          cohort: el.cohort || null,
          faculty_id: el.faculty_id ? Number(el.faculty_id) : null,
        });
        updatedEligibility.push(row);
      }
    }

    res.json({
      success: true,
      message: 'Cập nhật sự kiện thành công',
      data: { ...updatedEvent, eligibility: updatedEligibility },
    });
  } catch (err) { next(err); }
}

router.put('/events/:id', handleUpdateEvent);
router.patch('/events/:id', handleUpdateEvent);

/* =============================================================
   DELETE /api/admin/events/:id
   Use-Case: Admin xóa sự kiện (Tự chuyển sang CLOSED nếu đã có vé)
   ============================================================= */
router.delete('/events/:id', async (req, res, next) => {
  try {
    const adminUserId = req.body?.admin_user_id || req.query?.admin_user_id;
    await requireAdminOrStaff(adminUserId);

    const eventId = Number(req.params.id);
    const event = await db.findById('events', eventId);
    if (!event) throw httpError(404, 'Không tìm thấy sự kiện', 'EVENT_NOT_FOUND');

    const totalTickets = await db.count('tickets', t => t.event_id === eventId);
    if (totalTickets > 0) {
      const closedEvent = await db.update('events', eventId, { status: 'CLOSED' });
      await db.executeQuery(
        "UPDATE tickets SET checkin_status = 'CANCELLED' WHERE event_id = @p0 AND checkin_status = 'REGISTERED'",
        [eventId]
      );
      return res.json({
        success: true,
        message: 'Sự kiện đã có vé phát hành nên được chuyển sang trạng thái CLOSED và hủy các vé chờ.',
        data: closedEvent,
      });
    }

    await db.removeById('events', eventId);
    res.json({ success: true, message: 'Đã xóa sự kiện thành công' });
  } catch (err) { next(err); }
});

router.get('/events/:id/export', async (req, res, next) => {
  try {
    await requireAdminOrStaff(req.query.admin_user_id);
    const eventId = Number(req.params.id);
    const event = await db.findById('events', eventId);
    if (!event) throw httpError(404, 'Không tìm thấy sự kiện', 'EVENT_NOT_FOUND');

    const tickets = await db.findWhere('tickets', t => t.event_id === eventId && t.checkin_status === 'CHECKED_IN');

    const rows = [];
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      const stu = await db.findById('users', t.student_id);
      const fac = stu && stu.faculty_id ? await db.findById('faculties', stu.faculty_id) : null;
      const checker = t.checked_by ? await db.findById('users', t.checked_by) : null;
      
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

router.get('/tasks', async (req, res, next) => {
  try {
    await requireAdminOrStaff(req.query.admin_user_id);
    let tasks = await db.getAll('staff_tasks');
    
    if (req.query.event_id) {
      tasks = tasks.filter(t => t.event_id === Number(req.query.event_id));
    }

    const enriched = [];
    for (const t of tasks) {
      const assignee = t.assignee_id ? await db.findById('users', t.assignee_id) : null;
      const ev = await db.findById('events', t.event_id);
      enriched.push({ ...t, assignee_name: assignee?.full_name || null, event_title: ev?.title || null });
    }

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) { next(err); }
});

router.post('/tasks', async (req, res, next) => {
  try {
    const { admin_user_id, event_id, title, deadline, assignee_id, note } = req.body || {};
    await requireAdminOrStaff(admin_user_id);

    if (!event_id || !title || !deadline || !assignee_id) {
      throw httpError(400, 'Thiếu event_id, title, deadline hoặc assignee_id', 'MISSING_FIELDS');
    }
    if (!await db.findById('events', Number(event_id))) throw httpError(404, 'Không tìm thấy sự kiện', 'EVENT_NOT_FOUND');
    if (!await db.findById('users', Number(assignee_id))) throw httpError(404, 'Không tìm thấy assignee', 'ASSIGNEE_NOT_FOUND');

    const task = await db.insert('staff_tasks', {
      event_id: Number(event_id),
      title,
      deadline: new Date(deadline),
      assignee_id: Number(assignee_id),
      status: 'TODO',
      note: note || null,
    });

    res.status(201).json({ success: true, message: 'Tạo task thành công', data: task });
  } catch (err) { next(err); }
});

router.patch('/tasks/:id', async (req, res, next) => {
  try {
    const { admin_user_id, status, note, assignee_id, title, deadline } = req.body || {};
    await requireAdminOrStaff(admin_user_id);

    const taskId = Number(req.params.id);
    const task = await db.findById('staff_tasks', taskId);
    if (!task) throw httpError(404, 'Không tìm thấy task', 'TASK_NOT_FOUND');

    const patch = {};
    if (status) {
      if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) throw httpError(400, 'status không hợp lệ', 'INVALID_STATUS');
      patch.status = status;
    }
    if (title !== undefined) patch.title = title;
    if (deadline !== undefined) patch.deadline = new Date(deadline);
    if (note !== undefined) patch.note = note;
    if (assignee_id !== undefined) {
      if (!await db.findById('users', Number(assignee_id))) throw httpError(404, 'Không tìm thấy assignee', 'ASSIGNEE_NOT_FOUND');
      patch.assignee_id = Number(assignee_id);
    }
    if (Object.keys(patch).length === 0) throw httpError(400, 'Không có field nào cần cập nhật', 'NO_FIELDS');

    const updated = await db.update('staff_tasks', taskId, patch);
    res.json({ success: true, message: 'Cập nhật task thành công', data: updated });
  } catch (err) { next(err); }
});

module.exports = router;