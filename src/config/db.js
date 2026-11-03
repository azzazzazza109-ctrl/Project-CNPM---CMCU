/* =============================================================
   src/config/db.js
   Tầng dữ liệu thống nhất: Mock In-Memory (mặc định) ↔ SQL Server
   -------------------------------------------------------------
   • MOCK: đồng bộ 100% tên bảng/cột/UNIQUE với database/cmcu_database.sql
   • Chuyển sang SQL Server: đặt DB_MODE=sqlserver trong .env
   ============================================================= */
require('dotenv').config();

const DB_MODE = process.env.DB_MODE || 'mock'; // 'mock' | 'sqlserver'

/* -----------------------------------------------------------------
   Bản đồ khoá chính — dùng để auto-increment trong mock
   ----------------------------------------------------------------- */
const PK = {
  faculties:         'faculty_id',
  users:             'user_id',
  events:            'event_id',
  event_staffs:      'event_staff_id',
  event_eligibility: 'eligibility_id',
  tickets:           'ticket_id',
  staff_tasks:       'task_id',
};

/* -----------------------------------------------------------------
   Ràng buộc UNIQUE (mirror từ DDL) — chặn insert trùng ngay tại mock
   ----------------------------------------------------------------- */
const UNIQUES = {
  faculties:         [['faculty_name']],
  users:             [['student_code'], ['email']],
  events:            [],
  event_staffs:      [['event_id', 'user_id']],
  event_eligibility: [],
  tickets:           [['ticket_code'], ['qr_token'], ['event_id', 'student_id']],
  staff_tasks:       [],
};

/* -----------------------------------------------------------------
   Dữ liệu seed — KHỚP từng dòng với database/seed_data.sql
   ----------------------------------------------------------------- */
function seed() {
  /* -------------------------------------------------------------
     Ngày động: test không bao giờ hết hạn
     Event 1: bắt đầu sau 7 ngày  |  Event 2: bắt đầu sau 14 ngày
     ------------------------------------------------------------- */
  const nowMs = Date.now();
  const DAY   = 86_400_000;
  const HOUR  = 3_600_000;
  const iso   = (ms) => new Date(ms).toISOString();
  const start1 = nowMs + 7  * DAY;
  const start2 = nowMs + 14 * DAY;

  return {
    faculties: [
      { faculty_id: 1, faculty_name: 'Khoa Công nghệ Thông tin & Truyền thông' },
      { faculty_id: 2, faculty_name: 'Khoa Kinh doanh' },
      { faculty_id: 3, faculty_name: 'Khoa Mỹ thuật' },
    ],
    users: [
      { user_id: 1, student_code: 'BIT250001', full_name: 'Trần Long',      email: 'bit250001@st.cmcu.edu.vn', cohort: 'K1', class_name: 'BIT-K1A', faculty_id: 1,    system_role: 'STUDENT' },
      { user_id: 2, student_code: 'BIT250002', full_name: 'Bùi Anh Tú',     email: 'bit250002@st.cmcu.edu.vn', cohort: 'K1', class_name: 'BIT-K1A', faculty_id: 1,    system_role: 'STUDENT' },
      { user_id: 3, student_code: 'BBA250003', full_name: 'Lê Danh Lượng',  email: 'bba250003@st.cmcu.edu.vn', cohort: 'K1', class_name: 'BBA-K1A', faculty_id: 2,    system_role: 'STUDENT' },
      { user_id: 4, student_code: null,        full_name: 'Nguyễn Thị Hương',email: 'huong.nt@cmcu.edu.vn',    cohort: null, class_name: null,      faculty_id: 1,    system_role: 'STAFF'   },
      { user_id: 5, student_code: null,        full_name: 'Phạm Quốc Bảo',   email: 'bao.pq@cmcu.edu.vn',      cohort: null, class_name: null,      faculty_id: null, system_role: 'ADMIN'   },
      { user_id: 6, student_code: 'BIT250004', full_name: 'Nguyễn Văn Phú', email: 'bit250004@st.cmcu.edu.vn', cohort: 'K1', class_name: 'BIT-K1B', faculty_id: 1,   system_role: 'STUDENT' },
    ],
    events: [
      {
        event_id: 1,
        title: 'Hội thảo AI & Ứng dụng trong Doanh nghiệp',
        description: 'Chia sẻ từ chuyên gia về AI, LLM và ứng dụng thực tiễn tại doanh nghiệp.',
        location: 'Campus Vạn Phúc - Hội trường A',
        start_time: iso(start1),                    // ⭐ NGÀY ĐỘNG: +7 ngày
        end_time:   iso(start1 + 3.5 * HOUR),       // ⭐ +3.5 giờ
        seat_capacity: 2,
        cancel_deadline_hours: 24,
        status: 'OPEN',
        created_by: 5,
      },
      {
        event_id: 2,
        title: 'Workshop Kỹ năng Thuyết trình Chuyên nghiệp',
        description: 'Rèn luyện kỹ năng thuyết trình và giao tiếp trước công chúng.',
        location: 'Tòa nhà CMC Tower - Phòng 302',
        start_time: iso(start2),                    // ⭐ NGÀY ĐỘNG: +14 ngày
        end_time:   iso(start2 + 3.5 * HOUR),
        seat_capacity: 50,
        cancel_deadline_hours: 24,
        status: 'OPEN',
        created_by: 5,
      },
    ],
    event_staffs: [
      { event_staff_id: 1, event_id: 1, user_id: 4, role_in_event: 'Trưởng BTC' },
    ],
    event_eligibility: [
      { eligibility_id: 1, event_id: 1, cohort: 'K1', faculty_id: 1 },
      { eligibility_id: 2, event_id: 2, cohort: 'K1', faculty_id: 2 },
    ],
    tickets: [],
    staff_tasks: [
      { task_id: 1, event_id: 1, title: 'Đặt nước uống cho khách mời', deadline: iso(start1 - 1 * DAY), assignee_id: 4, status: 'TODO',        note: '20 chai' },
      { task_id: 2, event_id: 1, title: 'Kiểm tra máy chiếu & micro',  deadline: iso(start1 - 2 * DAY), assignee_id: 4, status: 'IN_PROGRESS', note: null },
    ],
    _seq: { faculties: 3, users: 6, events: 2, event_staffs: 1,
            event_eligibility: 2, tickets: 0, staff_tasks: 2 },
  };
}

/* =================================================================
   MOCK ADAPTER — In-Memory, đồng bộ schema
   ================================================================= */
let data = seed();

function clone(row) { return row ? { ...row } : null; }

const mockAdapter = {
  getAll(table)         { return data[table].map(clone); },

  findById(table, id)   {
    const row = data[table].find(r => r[PK[table]] === Number(id));
    return clone(row);
  },

  findOne(table, pred)  { return clone(data[table].find(pred)); },

  findWhere(table, pred){ return data[table].filter(pred).map(clone); },

  count(table, pred)    { return pred ? data[table].filter(pred).length : data[table].length; },

  insert(table, row) {
    // 1) Kiểm tra UNIQUE constraint (mirror DDL)
    for (const uc of (UNIQUES[table] || [])) {
      const dup = data[table].find(r => uc.every(col => r[col] === row[col]));
      if (dup) {
        const err = new Error(`UNIQUE constraint '${table}(${uc.join(', ')})' bị vi phạm.`);
        err.code = 'UNIQUE_VIOLATION';
        err.statusCode = 400;
        throw err;
      }
    }
    // 2) Auto-increment PK
    const id = ++data._seq[table];
    const record = { [PK[table]]: id, ...row };
    data[table].push(record);
    return clone(record);
  },

  update(table, id, patch) {
    const idx = data[table].findIndex(r => r[PK[table]] === Number(id));
    if (idx === -1) return null;
    data[table][idx] = { ...data[table][idx], ...patch };
    return clone(data[table][idx]);
  },

  remove(table, id) {
    const idx = data[table].findIndex(r => r[PK[table]] === Number(id));
    if (idx === -1) return false;
    data[table].splice(idx, 1);
    return true;
  },

  reset() { data = seed(); },
  PK,
};

/* =================================================================
   SQL SERVER ADAPTER — cùng interface, chuyển đổi sang T-SQL
   ================================================================= */
let sqlPool = null;

async function initSQLServer() {
  const sql = require('mssql');
  sqlPool = await sql.connect({
    server:   process.env.DB_SERVER   || 'localhost',
    port:     Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME     || 'CMCU',
    user:     process.env.DB_USER     || 'sa',
    password: process.env.DB_PASSWORD || '',
    options:  { encrypt: false, trustServerCertificate: true },
  });
  console.log('🔌 Đã kết nối SQL Server:', process.env.DB_NAME);
  return sqlPool;
}

/* =================================================================
   PUBLIC API — Route không cần biết đang dùng adapter nào
   ================================================================= */
module.exports = {
  mode: DB_MODE,
  get pool() { return sqlPool; },
  initSQLServer,

  // Các method dùng chung
  getAll:   (...a) => mockAdapter.getAll(...a),
  findById: (...a) => mockAdapter.findById(...a),
  findOne:  (...a) => mockAdapter.findOne(...a),
  findWhere:(...a) => mockAdapter.findWhere(...a),
  count:    (...a) => mockAdapter.count(...a),
  insert:   (...a) => mockAdapter.insert(...a),
  update:   (...a) => mockAdapter.update(...a),
  remove:   (...a) => mockAdapter.remove(...a),
  reset:    ()     => mockAdapter.reset(),
  PK,
};