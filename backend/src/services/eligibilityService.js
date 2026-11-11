const db = require('../config/db');

async function checkEligibility(user, eventId) {
  // Thêm await để chờ lấy dữ liệu mảng thực sự
  const eligibilities = await db.findWhere('event_eligibility', e => e.event_id === Number(eventId));
  
  // Không có dòng nào trong event_eligibility = mở cho toàn trường
  if (eligibilities.length === 0) return { ok: true };

  const isEligible = eligibilities.some(
    e => (!e.cohort || e.cohort === user.cohort) &&
         (!e.faculty_id || Number(e.faculty_id) === Number(user.faculty_id))
  );

  if (isEligible) return { ok: true };

  // Xử lý thông báo lỗi
  const faculty = user.faculty_id ? await db.findById('faculties', user.faculty_id) : null;
  const reqFaculties = [];
  for (const e of eligibilities) {
    if (e.faculty_id) {
      const f = await db.findById('faculties', e.faculty_id);
      reqFaculties.push(f?.faculty_name || `Khoa #${e.faculty_id}`);
    } else {
      reqFaculties.push('Tất cả các khoa');
    }
  }

  return {
    ok: false,
    message: `Sinh viên không đủ điều kiện tham dự. Yêu cầu: Khoá ${eligibilities.map(e => e.cohort || 'Tất cả').join('/')} — ` +
             `Khoa ${reqFaculties.join('/')}. ` +
             `Bạn hiện là ${user.cohort || 'N/A'} — ${faculty?.faculty_name || 'N/A'}.`
  };
}

module.exports = { checkEligibility };