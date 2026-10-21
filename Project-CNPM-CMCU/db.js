const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false, // Dành cho localhost
        trustServerCertificate: true,
        instanceName: 'SQLEXPRESS' // Tên server của bạn theo như trong hình
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