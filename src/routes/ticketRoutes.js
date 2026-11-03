/* =============================================================
   src/routes/ticketRoutes.js
   RESTful API cho vé: đăng ký & hủy
   -------------------------------------------------------------
   • POST /api/tickets/register  →  201 | 400(TC-02) | 403(TC-01) | 409(TC-03)
   • POST /api/tickets/cancel    →  200 | 400
   ============================================================= */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const qr = require('../services/qrService');
const eligibilityService = require('../services/eligibilityService');
const capacityService = require('../services/capacityService');

/* Helper tạo lỗi có status + code */
function httpError(status, message, code, data) {
  const err = new Error(message);
  err.statusCode = status;
  if (code) err.code = code;
  if (data) err.data = data;
  return err;
}

/* Format ISO → "HH:mm:ss - DD/MM/YYYY" (giờ Việt Nam) */
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
   POST /api/tickets/register
   Body: { event_id: number, student_code: string }
   ============================================================= */
router.post('/register', (req, res, next) => {
  try {
    const { event_id, student_code } = req.body || {};
    if (!event_id || !student_code) {
      throw httpError(400, 'Thiếu event_id hoặc student_code', 'MISSING_FIELDS');
    }
    const eventId = Number(event_id);

    /* ---------- 1. Xác thực sinh viên ---------- */
    const user = db.findOne('users', u => u.student_code === student_code);
    if (!user) {
      throw httpError(404, `Không tìm thấy sinh viên với mã ${student_code}`, 'USER_NOT_FOUND');
    }
    if (user.system_role !== 'STUDENT') {
      throw httpError(403, 'Chỉ tài khoản STUDENT mới được đăng ký vé', 'NOT_STUDENT');
    }

    /* ---------- 2. Xác thực sự kiện ---------- */
    const event = db.findById('events', eventId);
    if (!event) {
      throw httpError(404, `Không tìm thấy sự kiện #${eventId}`, 'EVENT_NOT_FOUND');
    }
    if (event.status === 'CLOSED') {
      throw httpError(400, 'Sự kiện đã đóng, không thể đăng ký', 'EVENT_CLOSED');
    }
    if (new Date(event.start_time) <= new Date()) {
      throw httpError(400, 'Sự kiện đã diễn ra, không thể đăng ký', 'EVENT_STARTED');
    }

        /* =========================================================
       GỌI SERVICE CỦA TÚ (PB-01) VÀ MINH (PB-02)
       ========================================================= */
    
    // 1. Gọi Tú check điều kiện (Eligibility)
    const eligCheck = eligibilityService.checkEligibility(user, eventId);
    if (!eligCheck.ok) {
      throw httpError(403, eligCheck.message, 'NOT_ELIGIBLE');
    }

    // 2. Gọi Minh check trùng vé (Duplicate)
    const dupCheck = capacityService.checkDuplicate(user, eventId);
    if (!dupCheck.ok) {
      throw httpError(400, dupCheck.message, 'DUPLICATE_TICKET');
    }
    // Lưu lại vé cũ (nếu vé đó đang bị CANCELLED) để tí nữa kích hoạt lại
    const existingTicket = dupCheck.existing; 

    // 3. Gọi Minh check sức chứa (Overbooking)
    const capCheck = capacityService.checkOverbooking(eventId, event.seat_capacity);
    if (!capCheck.ok) {
      throw httpError(409, capCheck.message, 'EVENT_FULL');
    }

    /* ---------- 6. Sinh mã vé + QR ---------- */
    const ticketCode = qr.generateTicketCode(eventId, student_code);
    const qrToken = qr.generateQrToken(ticketCode);
    const now = new Date().toISOString();

    let ticket;
    // Dùng existingTicket (do Minh trả về) thay vì biến existing cũ
    if (existingTicket && existingTicket.checkin_status === 'CANCELLED') {
      /* Tái kích hoạt vé đã hủy */
      ticket = db.update('tickets', existingTicket.ticket_id, {
        ticket_code: ticketCode,
        qr_token: qrToken,
        registered_at: new Date().toISOString(),
        checkin_status: 'REGISTERED',
        checkin_time: null,
        checked_by: null,
      });
    } else {
      try {
        ticket = db.insert('tickets', {
          event_id: eventId,
          student_id: user.user_id,
          ticket_code: ticketCode,
          qr_token: qrToken,
          registered_at: new Date().toISOString(),
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

    /* ---------- 7. Tự khóa FULL nếu vừa hết chỗ ---------- */
    // Dùng capCheck.activeCount (do Minh trả về) thay vì đếm lại
    if (capCheck.activeCount + 1 >= event.seat_capacity) {
      db.update('events', eventId, { status: 'FULL' });
    }

    /* ---------- 8. Trả 201 Created ---------- */
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
   Body: { ticket_code: string }  hoặc  { ticket_id: number }
   ============================================================= */
router.post('/cancel', (req, res, next) => {
  try {
    const { ticket_code, ticket_id } = req.body || {};

    let ticket = null;
    if (ticket_id) ticket = db.findById('tickets', ticket_id);
    else if (ticket_code) ticket = db.findOne('tickets', t => t.ticket_code === ticket_code);

    if (!ticket) {
      throw httpError(404, 'Không tìm thấy vé cần hủy', 'TICKET_NOT_FOUND');
    }
    if (ticket.checkin_status === 'CANCELLED') {
      throw httpError(400, 'Vé đã được hủy trước đó', 'ALREADY_CANCELLED');
    }
    if (ticket.checkin_status === 'CHECKED_IN') {
      throw httpError(400, 'Vé đã được điểm danh, không thể hủy', 'ALREADY_CHECKED_IN');
    }

    const event = db.findById('events', ticket.event_id);
    if (!event) {
      throw httpError(404, 'Sự kiện không tồn tại', 'EVENT_NOT_FOUND');
    }

    /* ---------- Kiểm tra hạn hủy vé ---------- */
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

    /* ---------- Hủy vé ---------- */
    db.update('tickets', ticket.ticket_id, { checkin_status: 'CANCELLED' });

    /* ---------- Mở lại sự kiện nếu đang FULL ---------- */
    let eventReopened = false;
    if (event.status === 'FULL') {
      db.update('events', event.event_id, { status: 'OPEN' });
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
   Điểm danh sinh viên khi tham dự sự kiện.
   -------------------------------------------------------------
   Hỗ trợ 3 phương thức (ưu tiên theo thứ tự):
     1. qr_token     — quét QR từ camera
     2. ticket_code  — nhập tay mã vé khi camera lỗi
     3. student_code — nhập tay mã SV + event_id khi camera lỗi

   Body: {
     qr_token?:     "64 ký tự hex",
     ticket_code?:  "TK-E1-BIT250001",
     student_code?: "BIT250001",
     event_id?:     1,           // bắt buộc khi dùng student_code
     staff_user_id: 4            // BẮT BUỘC: staff thực hiện điểm danh
   }
   ============================================================= */
router.post('/checkin', (req, res, next) => {
  try {
    const { qr_token, ticket_code, student_code, event_id, staff_user_id } = req.body || {};

    /* ---------- 1. Validate input ---------- */
    if (!qr_token && !ticket_code && !student_code) {
      throw httpError(
        400,
        'Cần cung cấp 1 trong 3: qr_token, ticket_code, hoặc student_code',
        'MISSING_TICKET_IDENTIFIER'
      );
    }
    if (!staff_user_id) {
      throw httpError(400, 'Thiếu staff_user_id (người thực hiện điểm danh)', 'MISSING_STAFF');
    }

    /* ---------- 2. Validate người quét ---------- */
    const staff = db.findById('users', staff_user_id);
    if (!staff) {
      throw httpError(404, `Không tìm thấy staff #${staff_user_id}`, 'STAFF_NOT_FOUND');
    }
    if (!['STAFF', 'ADMIN'].includes(staff.system_role)) {
      throw httpError(403, 'Chỉ STAFF hoặc ADMIN mới được điểm danh', 'NOT_STAFF');
    }

    /* ---------- 3. Tìm vé theo thứ tự ưu tiên ---------- */
    let ticket = null;
    let scanMethod = null;

    if (qr_token) {
      if (!qr.isValidQrFormat(qr_token)) {
        throw httpError(400, 'qr_token không hợp lệ (phải là 64 ký tự hex)', 'INVALID_QR_FORMAT');
      }
      ticket = db.findOne('tickets', t => t.qr_token === qr_token);
      scanMethod = 'QR_TOKEN';
    } else if (ticket_code) {
      ticket = db.findOne('tickets', t => t.ticket_code === ticket_code);
      scanMethod = 'TICKET_CODE';
    } else if (student_code) {
      if (!event_id) {
        throw httpError(
          400,
          'Khi dùng student_code phải kèm event_id (vì 1 SV có thể có nhiều vé)',
          'MISSING_EVENT_ID'
        );
      }
      const student = db.findOne('users', u => u.student_code === student_code);
      if (!student) {
        throw httpError(404, `Không tìm thấy sinh viên ${student_code}`, 'STUDENT_NOT_FOUND');
      }
      ticket = db.findOne(
        'tickets',
        t => t.event_id === Number(event_id) && t.student_id === student.user_id
      );
      scanMethod = 'STUDENT_CODE';
    }

    if (!ticket) {
      throw httpError(404, 'Không tìm thấy vé phù hợp', 'TICKET_NOT_FOUND');
    }

    /* ---------- 4. Nạp ngữ cảnh ---------- */
    const event   = db.findById('events', ticket.event_id);
    const student = db.findById('users', ticket.student_id);
    const faculty = student ? db.findById('faculties', student.faculty_id) : null;

    /* ---------- 5a. Vé đã HỦY ---------- */
    if (ticket.checkin_status === 'CANCELLED') {
      throw httpError(
        400,
        `Vé đã bị hủy — không thể điểm danh. Mã vé: ${ticket.ticket_code}`,
        'TICKET_CANCELLED',
        {
          ticket_code: ticket.ticket_code,
          student_code: student?.student_code || null,
          full_name: student?.full_name || null,
        }
      );
    }

    /* ---------- 5b. TC-CHECKIN-02: Chống quét lặp ---------- */
    if (ticket.checkin_status === 'CHECKED_IN') {
      const prevTime  = formatVnTime(ticket.checkin_time);
      const checker   = ticket.checked_by ? db.findById('users', ticket.checked_by) : null;

      throw httpError(
        400,
        `⚠️ CẢNH BÁO: Vé đã được điểm danh trước đó lúc ${prevTime}` +
          (checker ? ` bởi ${checker.full_name}` : '') +
          `. Mã vé: ${ticket.ticket_code}. KHÔNG thể điểm danh lại (chống điểm danh hộ).`,
        'ALREADY_CHECKED_IN',
        {
          ticket_id: ticket.ticket_id,
          ticket_code: ticket.ticket_code,
          checkin_status: ticket.checkin_status,
          first_checkin_time: ticket.checkin_time,
          first_checkin_time_vn: prevTime,
          first_checked_by: checker
            ? { user_id: checker.user_id, full_name: checker.full_name }
            : null,
          student: student
            ? {
                user_id: student.user_id,
                student_code: student.student_code,
                full_name: student.full_name,
                cohort: student.cohort,
                faculty_name: faculty?.faculty_name || null,
              }
            : null,
          warning: 'Vé đã được điểm danh trước đó — từ chối quét trùng.',
        }
      );
    }

    /* ---------- 6. Điểm danh thành công ---------- */
    const nowIso = new Date().toISOString();
    const updated = db.update('tickets', ticket.ticket_id, {
      checkin_status: 'CHECKED_IN',
      checkin_time: nowIso,
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