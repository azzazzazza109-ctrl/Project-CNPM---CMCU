const { sql, poolPromise } = require('../config/db');

// Lấy danh sách tất cả sự kiện
exports.getAllEvents = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM EVENTS ORDER BY event_id DESC");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Tạo sự kiện mới (Dành cho Admin)
exports.createEvent = async (req, res) => {
    const { title, seat_capacity } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('title', sql.NVarChar(200), title)
            .input('seat_capacity', sql.Int, seat_capacity)
            .query("INSERT INTO EVENTS (title, seat_capacity, status) VALUES (@title, @seat_capacity, 'OPEN')");
        
        res.status(201).json({ success: true, message: "Tạo sự kiện mới thành công!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};