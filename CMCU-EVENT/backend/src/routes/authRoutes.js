const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
        }

        // Tìm user theo email hoặc mã sinh viên (student_code)
        const query = `
            SELECT user_id, student_code, email, full_name, system_role, password 
            FROM users 
            WHERE email = @p0 OR student_code = @p0
        `;
        const users = await executeQuery(query, [username]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
        }

        const user = users[0];

        // Kiểm tra mật khẩu (hiện tại đang so sánh chuỗi thường)
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Sai mật khẩu' });
        }

        // Xóa password trước khi trả về để bảo mật
        delete user.password;

        // (Tùy chọn) Sinh token giả lập
        const fakeToken = `token-${user.user_id}-${Date.now()}`;

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token: fakeToken,
            user: user
        });

    } catch (err) {
        next(err);
    }
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const { username, password, full_name, student_code, class_name } = req.body;
        
        // Kiểm tra xem Mã SV hoặc Email đã tồn tại chưa
        const checkQuery = `SELECT * FROM users WHERE student_code = @p0 OR email = @p1`;
        const existing = await executeQuery(checkQuery, [student_code, username]);

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Mã sinh viên hoặc Email đã tồn tại' });
        }

        // Thêm user mới vào Database (Mặc định quyền STUDENT)
        const insertQuery = `
            INSERT INTO users (student_code, email, password, full_name, class_name, system_role)
            OUTPUT INSERTED.user_id, INSERTED.full_name, INSERTED.system_role, INSERTED.student_code
            VALUES (@p0, @p1, @p2, @p3, @p4, 'STUDENT')
        `;
        const result = await executeQuery(insertQuery, [
            student_code, username, password, full_name, class_name || null
        ]);

        res.status(201).json({ success: true, message: 'Đăng ký thành công', user: result[0] });
    } catch (err) {
        next(err);
    }
});

module.exports = router;