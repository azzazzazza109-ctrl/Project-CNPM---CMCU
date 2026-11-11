const express = require('express');
const router = express.Router();
const db = require('../config/db');
const qr = require('../services/qrService');
const eligibilityService = require('../services/eligibilityService');
const capacityService = require('../services/capacityService');

function httpError(status, message, code, data) {
  const err = new Error(message);
  err.statusCode = status;
  if (code) err.code = code;
  if (data) err.data = data;
  return err;
}

function formatVnTime(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/* =============================================================
   GET /api/tickets/my-tickets?student_id=X
   ============================================================= */
router.get('/my-tickets', async (req, res, next) => {
  try {
    const { student_id } = req.query || {};
    if (!student_id) throw httpError(400, 'Thiếu student_id', 'MISSING_FIELDS');

    const tickets = await db.findWhere('tickets', t => t.student_id === Number(student_id));
    
    const enriched = [];
    for (const t of tickets) {
        const ev = await db.findById('events', t.event_id);
        enriched.push({ 
            ...t, 
            event_title: ev?.title || 'Không rõ', 
            event_location: ev?.location || 'Không rõ',
            event_start: ev?.start_time
        });
    }

    res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
});

/* =============================================================
   POST /api/tickets/register
   ============================================================= */
router.post('/register', async (req, res, next) => { // Thêm async
  try {
    const { event_id, student_code } = req.body || {};
    if (!event_id || !student_code) {
      throw httpError(400, 'Thiếu event_id hoặc student_code', 'MISSING_FIELDS');
    }
    const eventId = Number(event_id);

    /* ---------- 1. Xác thực sinh viên ---------- */
    const user = await db.findOne('users', u => u.student_code === student_code); // Thêm await
    if (!user) {
      throw httpError(404, `Không tìm thấy sinh viên với mã ${student_code}`, 'USER_NOT_FOUND');
    }
    // Thêm .trim() để phòng trường hợp có khoảng trắng trong DB
    if (user.system_role?.trim() !== 'STUDENT') {
      throw httpError(403, 'Chỉ tài khoản STUDENT mới được đăng ký vé', 'NOT_STUDENT');
    }

    /* ---------- 2. Xác thực sự kiện ---------- */
    const event = await db.findById('events', eventId); // Thêm await
    if (!event) {
      throw httpError(404, `Không tìm thấy sự kiện #${eventId}`, 'EVENT_NOT_FOUND');
    }
    if (event.status === 'CLOSED') {
      throw httpError(400, 'Sự kiện đã đóng, không thể đăng ký', 'EVENT_CLOSED');
    }
    if (new Date(event.start_time) <= new Date()) {
      throw httpError(400, 'Sự kiện đã diễn ra, không thể đăng ký', 'EVENT_STARTED');
    }

    /* ---------- 3. Gọi Service kiểm tra điều kiện & sức chứa ---------- */
    const eligCheck = await eligibilityService.checkEligibility(user, eventId); // Thêm await
    if (!eligCheck.ok) {
      throw httpError(403, eligCheck.message, 'NOT_ELIGIBLE');
    }

    const dupCheck = await capacityService.checkDuplicate(user, eventId); // Thêm await
    if (!dupCheck.ok) {
      throw httpError(400, dupCheck.message, 'DUPLICATE_TICKET');
    }
    const existingTicket = dupCheck.existing;

    const capCheck = await capacityService.checkOverbooking(eventId, event.seat_capacity); // Thêm await
    if (!capCheck.ok) {
      throw httpError(409, capCheck.message, 'EVENT_FULL');
    }

    /* ---------- 4. Sinh mã vé + QR ---------- */
    const ticketCode = qr.generateTicketCode(eventId, student_code);
    const qrToken = qr.generateQrToken(ticketCode);
    const nowDate = new Date();

    let ticket;
    if (existingTicket && existingTicket.checkin_status === 'CANCELLED') {
      ticket = await db.update('tickets', existingTicket.ticket_id, {
        ticket_code: ticketCode,
        qr_token: qrToken,
        registered_at: nowDate,
        checkin_status: 'REGISTERED',
        checkin_time: null,
        checked_by: null,
      });
    } else {
      try {
        ticket = await db.insert('tickets', {
          event_id: eventId,
          student_id: user.user_id,
          ticket_code: ticketCode,
          qr_token: qrToken,
          registered_at: nowDate,
          checkin_status: 'REGISTERED',
          checkin_time: null,
          checked_by: null,
        });
      } catch (e) {
        if (e.code === 'UNIQUE_VIOLATION') {
          throw httpError(400, 'Vé đã tồn tại cho sự kiện này', 'DUPLICATE_TICKET');
        }
        throw e;
      }
    }

    /* ---------- 5. Tự khóa FULL nếu vừa hết chỗ ---------- */
    const newCount = capCheck.activeCount + 1;
    if (newCount >= event.seat_capacity) {
      await db.update('events', eventId, { status: 'FULL' });
    }

    /* ---------- 6. Trả 201 Created ---------- */
    res.status(201).json({
      success: true,
      message: 'Đăng ký vé thành công',
      data: {
        ticket_id: ticket.ticket_id,
        ticket_code: ticket.ticket_code,
        qr_token: ticket.qr_token,
        event_id: eventId,
        event_title: event.title,
        event_location: event.location,
        event_start_time: event.start_time,
        student_code: user.student_code,
        full_name: user.full_name,
        checkin_status: ticket.checkin_status,
        registered_at: ticket.registered_at,
        seats_left_after: Math.max(0, event.seat_capacity - newCount),
      },
    });
  } catch (err) {
    next(err);
  }
});

/* =============================================================
   POST /api/tickets/cancel
   ============================================================= */
router.post('/cancel', async (req, res, next) => { // Thêm async
  try {
    const { ticket_code, ticket_id } = req.body || {};

    let ticket = null;
    if (ticket_id) ticket = await db.findById('tickets', Number(ticket_id)); // Thêm await
    else if (ticket_code) ticket = await db.findOne('tickets', t => t.ticket_code === ticket_code); // Thêm await

    if (!ticket) {
      throw httpError(404, 'Không tìm thấy vé cần hủy', 'TICKET_NOT_FOUND');
    }
    if (ticket.checkin_status === 'CANCELLED') {
      throw httpError(400, 'Vé đã được hủy trước đó', 'ALREADY_CANCELLED');
    }
    if (ticket.checkin_status === 'CHECKED_IN') {
      throw httpError(400, 'Vé đã được điểm danh, không thể hủy', 'ALREADY_CHECKED_IN');
    }

    const event = await db.findById('events', ticket.event_id); // Thêm await
    if (!event) {
      throw httpError(404, 'Sự kiện không tồn tại', 'EVENT_NOT_FOUND');
    }

    const now = new Date();
    const deadline = new Date(
      new Date(event.start_time).getTime() - event.cancel_deadline_hours * 3600 * 1000
    );
    if (now > deadline) {
      throw httpError(
        400,
        `Đã quá hạn hủy vé. Hạn chót: ${deadline.toLocaleString('vi-VN')} ` +
        `(trước ${event.cancel_deadline_hours}h so với giờ bắt đầu sự kiện).`,
        'CANCEL_DEADLINE_PASSED'
      );
    }

    await db.update('tickets', ticket.ticket_id, { checkin_status: 'CANCELLED' }); // Thêm await

    let eventReopened = false;
    if (event.status === 'FULL') {
      await db.update('events', event.event_id, { status: 'OPEN' }); // Thêm await
      eventReopened = true;
    }

    res.json({
      success: true,
      message: 'Hủy vé thành công',
      data: {
        ticket_id: ticket.ticket_id,
        ticket_code: ticket.ticket_code,
        event_id: event.event_id,
        event_title: event.title,
        checkin_status: 'CANCELLED',
        event_reopened: eventReopened,
        event_status_after: eventReopened ? 'OPEN' : event.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* =============================================================
   POST /api/tickets/checkin
   ============================================================= */
router.post('/checkin', async (req, res, next) => { // Thêm async
  try {
    const { qr_token, ticket_code, student_code, event_id, staff_user_id } = req.body || {};

    if (!qr_token && !ticket_code && !student_code) {
      throw httpError(400, 'Cần cung cấp 1 trong 3: qr_token, ticket_code, hoặc student_code', 'MISSING_TICKET_IDENTIFIER');
    }
    if (!staff_user_id) {
      throw httpError(400, 'Thiếu staff_user_id', 'MISSING_STAFF');
    }

    const staff = await db.findById('users', Number(staff_user_id)); // Thêm await
    if (!staff) {
      throw httpError(404, `Không tìm thấy staff #${staff_user_id}`, 'STAFF_NOT_FOUND');
    }
    if (!['STAFF', 'ADMIN'].includes(staff.system_role)) {
      throw httpError(403, 'Chỉ STAFF hoặc ADMIN mới được điểm danh', 'NOT_STAFF');
    }

    let ticket = null;
    let scanMethod = null;

    if (qr_token) {
      if (!qr.isValidQrFormat(qr_token)) {
        throw httpError(400, 'qr_token không hợp lệ', 'INVALID_QR_FORMAT');
      }
      ticket = await db.findOne('tickets', t => t.qr_token === qr_token); // Thêm await
      scanMethod = 'QR_TOKEN';
    } else if (ticket_code) {
      ticket = await db.findOne('tickets', t => t.ticket_code === ticket_code); // Thêm await
      scanMethod = 'TICKET_CODE';
    } else if (student_code) {
      if (!event_id) throw httpError(400, 'Khi dùng student_code phải kèm event_id', 'MISSING_EVENT_ID');
      
      const student = await db.findOne('users', u => u.student_code === student_code); // Thêm await
      if (!student) throw httpError(404, `Không tìm thấy sinh viên ${student_code}`, 'STUDENT_NOT_FOUND');
      
      ticket = await db.findOne('tickets', t => t.event_id === Number(event_id) && t.student_id === student.user_id); // Thêm await
      scanMethod = 'STUDENT_CODE';
    }

    if (!ticket) throw httpError(404, 'Không tìm thấy vé phù hợp', 'TICKET_NOT_FOUND');

    const event = await db.findById('events', ticket.event_id); // Thêm await
    const student = await db.findById('users', ticket.student_id); // Thêm await
    const faculty = student && student.faculty_id ? await db.findById('faculties', student.faculty_id) : null; // Thêm await

    if (!event) throw httpError(404, 'Sự kiện của vé này không tồn tại', 'EVENT_NOT_FOUND');

    if (event.status === 'CLOSED') throw httpError(400, 'Sự kiện đã đóng, không thể điểm danh', 'EVENT_CLOSED');

    const nowMs = Date.now();
    const allowFromMs = new Date(event.start_time).getTime() - 2 * 3600 * 1000;
    const allowToMs = new Date(event.end_time).getTime();
    if (nowMs < allowFromMs || nowMs > allowToMs) {
      throw httpError(400, `Ngoài khung giờ điểm danh (${formatVnTime(event.start_time)} - ${formatVnTime(event.end_time)}).`, 'OUTSIDE_CHECKIN_WINDOW');
    }

    if (ticket.checkin_status === 'CANCELLED') {
      throw httpError(400, `Vé đã bị hủy — không thể điểm danh. Mã vé: ${ticket.ticket_code}`, 'TICKET_CANCELLED');
    }

    if (ticket.checkin_status === 'CHECKED_IN') {
      const prevTime = formatVnTime(ticket.checkin_time);
      const checker = ticket.checked_by ? await db.findById('users', ticket.checked_by) : null; // Thêm await
      throw httpError(400, `⚠️ Vé đã được điểm danh trước đó lúc ${prevTime}` + (checker ? ` bởi ${checker.full_name}` : ''), 'ALREADY_CHECKED_IN');
    }

    const nowDate = new Date();
    const updated = await db.update('tickets', ticket.ticket_id, { // Thêm await
      checkin_status: 'CHECKED_IN',
      checkin_time: nowDate,
      checked_by: staff.user_id,
    });

    res.json({
      success: true,
      message: 'Điểm danh thành công',
      data: {
        ticket_id: updated.ticket_id,
        ticket_code: updated.ticket_code,
        checkin_status: updated.checkin_status,
        checkin_time: updated.checkin_time,
        checkin_time_vn: formatVnTime(updated.checkin_time),
        scan_method: scanMethod,
        student: {
          user_id: student.user_id,
          student_code: student.student_code,
          full_name: student.full_name,
          cohort: student.cohort,
          class_name: student.class_name,
          faculty_id: student.faculty_id,
          faculty_name: faculty?.faculty_name || null,
        },
        event: {
          event_id: event.event_id,
          title: event.title,
          location: event.location,
          start_time: event.start_time,
        },
        checked_by: {
          user_id: staff.user_id,
          full_name: staff.full_name,
          system_role: staff.system_role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;