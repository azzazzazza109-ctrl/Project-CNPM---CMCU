const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('❌ Kết nối CSDL MySQL thất bại:', err.message);
        return;
    }
    console.log('✅ Đã kết nối thành công với cơ sở dữ liệu MySQL (cmcu_event_db)!');
});

module.exports = db;