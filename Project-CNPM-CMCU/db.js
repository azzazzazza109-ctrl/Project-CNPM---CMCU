const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: '127.0.0.1', // <-- SỬA DÒNG NÀY
    port: 1433,
    database: process.env.DB_DATABASE,
    requestTimeout: 60000, 
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('✅ Đã kết nối thành công tới SQL Server (cmcu_event_db)!');
        return pool;
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối CSDL: ', err);
    });

module.exports = { sql, poolPromise };