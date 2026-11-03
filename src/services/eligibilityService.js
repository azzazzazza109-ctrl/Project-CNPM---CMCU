const db = require('../config/db');

function checkEligibility(user, eventId) {
  const eligibilities = db.findWhere('event_eligibility', e => e.event_id === eventId);
  
  if (eligibilities.length === 0) return { ok: true }; // Không set điều kiện thì ai cũng được

  const isEligible = eligibilities.some(
    e => e.cohort === user.cohort && e.faculty_id === user.faculty_id
  );

  if (isEligible) return { ok: true };

  const faculty = db.findById('faculties', user.faculty_id);
  return {
    ok: false,
    message: `Sinh viên không đủ điều kiện tham dự. Yêu cầu: Khoá ${eligibilities.map(e=>e.cohort).join('/')} — ` +
             `Khoa ${eligibilities.map(e => db.findById('faculties', e.faculty_id)?.faculty_name).join('/')}. ` +
             `Bạn hiện là ${user.cohort} — ${faculty?.faculty_name || 'N/A'}.`
  };
}

module.exports = { checkEligibility };
