require('dotenv').config();
const sql = require('mssql');

const DB_MODE = process.env.DB_MODE || 'sqlserver';

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'cmcu_event_db',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let poolPromise = null;
const initSQLServer = async () => {
  try {
    poolPromise = await sql.connect(config);
    console.log('✅ Đã kết nối SQL Server:', process.env.DB_NAME);
    return poolPromise;
  } catch (err) {
    console.error('❌ Lỗi kết nối CSDL:', err.message);
    throw err;
  }
};

const executeQuery = async (query, params = []) => {
  const pool = await poolPromise;
  const request = pool.request();
  params.forEach((param, index) => {
    request.input(`p${index}`, param);
  });
  try {
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    // Chuyển mã lỗi trùng khóa của SQL Server (2627, 2601) sang UNIQUE_VIOLATION
    if (err && (err.number === 2627 || err.number === 2601)) {
      err.code = 'UNIQUE_VIOLATION';
    }
    throw err;
  }
};

const PK = {
  faculties: 'faculty_id', users: 'user_id', events: 'event_id',
  event_eligibility: 'eligibility_id', tickets: 'ticket_id', staff_tasks: 'task_id',
};

const sqlAdapter = {
  getAll: async (table) => {
    return await executeQuery(`SELECT * FROM ${table}`);
  },
  findById: async (table, id) => {
    const res = await executeQuery(`SELECT * FROM ${table} WHERE ${PK[table]} = @p0`, [id]);
    return res[0] || null;
  },
  findOne: async (table, pred) => {
    const all = await executeQuery(`SELECT * FROM ${table}`);
    return all.find(pred) || null;
  },
  findWhere: async (table, pred) => {
    const all = await executeQuery(`SELECT * FROM ${table}`);
    return all.filter(pred);
  },
  count: async (table, pred) => {
    const all = await executeQuery(`SELECT * FROM ${table}`);
    return pred ? all.filter(pred).length : all.length;
  },
  insert: async (table, row) => {
    const keys = Object.keys(row);
    const values = Object.values(row);
    const placeholders = keys.map((_, i) => `@p${i}`).join(', ');
    const query = `INSERT INTO ${table} (${keys.join(', ')}) OUTPUT INSERTED.* VALUES (${placeholders})`;
    const res = await executeQuery(query, values);
    return res[0];
  },
  update: async (table, id, patch) => {
    const keys = Object.keys(patch);
    const values = Object.values(patch);
    const setClause = keys.map((k, i) => `${k} = @p${i}`).join(', ');
    const query = `UPDATE ${table} SET ${setClause} OUTPUT INSERTED.* WHERE ${PK[table]} = @p${keys.length}`;
    const res = await executeQuery(query, [...values, id]);
    return res[0];
  },
  removeById: async (table, id) => {
    return await executeQuery(`DELETE FROM ${table} WHERE ${PK[table]} = @p0`, [id]);
  }
};

module.exports = {
  initSQLServer,
  executeQuery,
  mode: 'sqlserver',
  ...sqlAdapter,
  PK,
};