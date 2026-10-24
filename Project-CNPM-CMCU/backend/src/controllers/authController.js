const { sql, poolPromise } = require('../config/db');
const bcrypt = require('bcrypt');

// API Đăng nhập
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.VarChar(100), email)
            .query("SELECT * FROM USERS WHERE email = @email");

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không đúng!" });
        }

        const user = result.recordset[0];
        
        // Kiểm tra mật khẩu (Vì data mẫu đang lưu pass là '123', chưa mã hóa nên ta so sánh chuỗi thẳng)
        // Nếu sau này bạn dùng bcrypt thì đổi thành: const isMatch = await bcrypt.compare(password, user.password_hash);
        const isMatch = (password === user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không đúng!" });
        }

        // Lưu thông tin vào session
        req.session.user = {
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            system_role: user.system_role,
            student_code: user.student_code
        };

        res.json({ success: true, message: "Đăng nhập thành công!", user: req.session.user });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

// API Đăng xuất
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, message: "Lỗi khi đăng xuất" });
        res.clearCookie('connect.sid'); // Xóa cookie
        res.json({ success: true, message: "Đăng xuất thành công!" });
    });
};

// API Lấy thông tin user đang đăng nhập
exports.getMe = (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ success: false, message: "Chưa đăng nhập" });
    }
};