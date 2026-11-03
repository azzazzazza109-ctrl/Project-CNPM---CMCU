require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourStrongPassword123',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'cmcu_event_db',
    options: {
        encrypt: false, // Dùng false cho local SQL Server
        trustServerCertificate: true, // Bắt buộc cho local dev
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise = null;

const connectDB = async () => {
    try {
        if (poolPromise) return poolPromise;
        poolPromise = await sql.connect(config);
        console.log('✅ Kết nối SQL Server thành công!');
        return poolPromise;
    } catch (err) {
        console.error('❌ Lỗi kết nối CSDL:', err.message);
        poolPromise = null;
        throw err;
    }
};

// Hàm query chung
const executeQuery = async (query, params = []) => {
    try {
        const pool = await connectDB();
        const request = pool.request();
        // Bind params nếu có (tránh SQL Injection)
        params.forEach((param, index) => {
            request.input(`p${index}`, param);
        });
        // Thay thế @p0, @p1... nếu cần (ở đây query thô dùng trực tiếp cho đơn giản)
        const result = await request.query(query);
        return result.recordset;
    } catch (err) {
        console.error('Lỗi truy vấn:', err);
        throw err;
    }
};

module.exports = { connectDB, executeQuery, sql };