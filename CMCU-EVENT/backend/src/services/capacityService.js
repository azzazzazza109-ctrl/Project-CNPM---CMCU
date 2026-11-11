const db = require('../config/db');

async function checkDuplicate(user, eventId) {
  const existing = await db.findOne(
    'tickets',
    t => t.event_id === Number(eventId) && t.student_id === Number(user.user_id)
  );
  
  // Thêm điều kiện kiểm tra existing.checkin_status có tồn tại không
  if (existing && existing.checkin_status && existing.checkin_status !== 'CANCELLED') {
    return {
      ok: false,
      message: `Sinh viên đã có vé (${existing.checkin_status}), mã vé: ${existing.ticket_code || 'N/A'}`
    };
  }
  
  // Nếu vé bị lỗi (không có checkin_status), coi như chưa có vé và cho phép tạo mới
  return { ok: true, existing };
}

async function checkOverbooking(eventId, seatCapacity) {
  const activeCount = await db.count(
    'tickets',
    t => t.event_id === Number(eventId) && t.checkin_status !== 'CANCELLED'
  );
  if (activeCount >= Number(seatCapacity)) {
    await db.update('events', Number(eventId), { status: 'FULL' }); 
    return { ok: false, message: `Sự kiện đã đầy chỗ (${activeCount}/${seatCapacity}).` };
  }
  return { ok: true, activeCount };
}

module.exports = { checkDuplicate, checkOverbooking };