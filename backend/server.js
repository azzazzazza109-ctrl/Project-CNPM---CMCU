require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./src/config/db');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

/* =============================================================
   MIDDLEWARE
   ============================================================= */
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* --- Log request --- */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/* =============================================================
   API LẤY DANH SÁCH SỰ KIỆN (Gộp trực tiếp vào đây)
   ============================================================= */
   // API lấy danh sách Khoa & Staff/Admin phục vụ form Frontend
app.get('/api/meta', async (req, res, next) => {
  try {
    const faculties = await db.getAll('faculties');
    const users = await db.getAll('users');
    const staffList = users
      .filter(u => ['ADMIN', 'STAFF'].includes(u.system_role))
      .map(u => ({ user_id: u.user_id, full_name: u.full_name, system_role: u.system_role }));
    res.json({ success: true, data: { faculties, staffList } });
  } catch (err) {
    next(err);
  }
});

app.get('/api/events', async (req, res, next) => {
  try {
    const eventsData = await db.getAll('events');
    
    // Xử lý thêm thông tin người tạo và điều kiện tham gia
    const events = await Promise.all(eventsData.map(async (ev) => {
      const creator = await db.findById('users', ev.created_by);
      const eligibilities = await db.findWhere('event_eligibility', el => el.event_id === ev.event_id);
      
      const eligibility = await Promise.all(eligibilities.map(async (el) => {
          const fac = await db.findById('faculties', el.faculty_id);
          return {
            cohort: el.cohort,
            faculty_id: el.faculty_id,
            faculty_name: fac?.faculty_name ?? null,
          };
      }));

      const registeredCount = await db.count(
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
    }));

    res.json({ success: true, count: events.length, data: events });
  } catch (err) { 
    next(err); 
  }
});

/* =============================================================
   KHAI BÁO CÁC ROUTES KHÁC
   ============================================================= */
const adminRoutes = require('./src/routes/adminRoutes.js');
const ticketRoutes = require('./src/routes/ticketRoutes.js');
const authRoutes = require('./src/routes/authRoutes.js'); 

app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/auth', authRoutes); 

/* =============================================================
   HEALTH CHECK
   ============================================================= */
app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'CMCU Backend', timestamp: new Date().toISOString() });
});

/* =============================================================
   ERROR HANDLER
   ============================================================= */
app.use((err, req, res, next) => {
  console.error('❌ Lỗi:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ',
  });
});

/* =============================================================
   KHỞI ĐỘNG
   ============================================================= */
(async () => {
  try {
    await db.initSQLServer(); 
    app.listen(PORT, () => {
      console.log(`\n🚀 CMCU Backend: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Khởi động thất bại:', err.message);
    process.exit(1);
  }
})();