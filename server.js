/* =============================================================
   server.js — CMCU Backend
   ============================================================= */
require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 3000;

/* --- Middleware --- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* --- Log request ngắn gọn --- */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/* =============================================================
   HEALTH CHECK — kiểm tra server & tầng dữ liệu đã sẵn sàng
   ============================================================= */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'CMCU Backend',
    version: '1.0.0',
    db_mode: db.mode,
    timestamp: new Date().toISOString(),
  });
});

/* =============================================================
   GET /api/events — Liệt kê sự kiện (kèm creator + eligibility)
   ============================================================= */
app.get('/api/events', (req, res, next) => {
  try {
    const events = db.getAll('events').map(ev => {
      const creator = db.findById('users', ev.created_by);
      const eligibility = db
        .findWhere('event_eligibility', el => el.event_id === ev.event_id)
        .map(el => {
          const fac = db.findById('faculties', el.faculty_id);
          return {
            cohort: el.cohort,
            faculty_id: el.faculty_id,
            faculty_name: fac?.faculty_name ?? null,
          };
        });
      const registeredCount = db.count(
        'tickets',
        t => t.event_id === ev.event_id && t.checkin_status !== 'CANCELLED'
      );
      return {
        ...ev,
        created_by_name: creator?.full_name ?? null,
        eligibility,
        registered_count: registeredCount,
        seats_left: Math.max(0, ev.seat_capacity - registeredCount),
      };
    });

    res.json({ success: true, count: events.length, data: events });
  } catch (err) { next(err); }
});
/* =============================================================
   MOUNT ROUTES — Vé (Bước 2)
   ============================================================= */
app.use('/api/tickets', require('./src/routes/ticketRoutes'));
app.use('/api/admin',   require('./src/routes/adminRoutes'));   // ⭐ MỚI

/* =============================================================
   DEV ONLY — Endpoint debug (tiện test/soi state)
   Tự động tắt khi NODE_ENV=production
   ============================================================= */
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/dev/tickets', (req, res) => {
    const tickets = db.getAll('tickets').map(t => {
      const stu = db.findById('users', t.student_id);
      const ev  = db.findById('events', t.event_id);
      const chk = t.checked_by ? db.findById('users', t.checked_by) : null;
      return {
        ticket_id:      t.ticket_id,
        ticket_code:    t.ticket_code,
        event_id:       t.event_id,
        event_title:    ev?.title || null,
        student_code:   stu?.student_code || null,
        full_name:      stu?.full_name || null,
        checkin_status: t.checkin_status,
        checkin_time:   t.checkin_time,
        checked_by:     chk ? chk.full_name : null,
        qr_token:       t.qr_token,
      };
    });
    res.json({ success: true, count: tickets.length, data: tickets });
  });
}
/* =============================================================
   ERROR HANDLER TẬP TRUNG
   ============================================================= */
app.use((err, req, res, next) => {
  console.error('❌ Lỗi:', err.message);
  const body = {
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ',
  };
  if (err.code) body.code = err.code;
  if (err.data) body.data = err.data;   // ⭐ mới: cho checkin trả giờ checkin lần đầu
  res.status(err.statusCode || 500).json(body);
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Không tìm thấy endpoint' });
});

/* =============================================================
   KHỞI ĐỘNG
   ============================================================= */
(async () => {
  try {
    if (db.mode === 'sqlserver') {
      await db.initSQLServer();
    } else {
      console.log('🧪 Chế độ MOCK DB — dữ liệu seed CMC đã nạp sẵn.');
      console.log(`   → ${db.getAll('faculties').length} khoa, ` +
                  `${db.getAll('users').length} users, ` +
                  `${db.getAll('events').length} sự kiện.`);
    }
    app.listen(PORT, () => {
      console.log(`\n🚀 CMCU Backend: http://localhost:${PORT}`);
      console.log(`   Health : http://localhost:${PORT}/api/health`);
      console.log(`   Events : http://localhost:${PORT}/api/events\n`);
    });
  } catch (err) {
    console.error('❌ Khởi động thất bại:', err.message);
    process.exit(1);
  }
})();