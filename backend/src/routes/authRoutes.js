const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // 👉 Thêm thư viện JWT
const { executeQuery } = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
    }

    const query = `
      SELECT u.user_id, u.student_code, u.email, u.full_name, u.cohort, u.class_name, u.faculty_id, f.faculty_name, u.system_role, u.password
      FROM users u
      LEFT JOIN faculties f ON u.faculty_id = f.faculty_id
      WHERE u.email = @p0 OR u.student_code = @p0
    `;
    const users = await executeQuery(query, [username]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    const user = users[0];

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Sai mật khẩu' });
    }

    delete user.password;

    // 👉 XÓA fakeToken, THAY BẰNG JWT TOKEN THẬT
    const token = jwt.sign(
      { user_id: user.user_id, role: user.system_role },
      process.env.JWT_SECRET || 'cmcu_default_secret',
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token: token, // Trả về JWT xịn
      user: user
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;