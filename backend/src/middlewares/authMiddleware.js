const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Truy cập bị từ chối. Token không tồn tại.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cmcu_default_secret');
        req.user = decoded; // Lưu { user_id, role } vào req để các route sau dùng
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
}

/**
 * Middleware phân quyền dựa trên danh sách các vai trò cho phép
 * @param {string[]} allowedRoles Mảng danh sách các role hợp lệ, ví dụ: ['ADMIN', 'STAFF']
 */
function checkRole(allowedRoles = []) {
    return (req, res, next) => {
        // Kiểm tra xem user đã qua bước verifyToken hay chưa
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: 'Chưa xác thực người dùng. Vui lòng đăng nhập lại.'
            });
        }

        // Kiểm tra role của user có nằm trong danh sách được cấp phép không
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thực hiện thao tác này.'
            });
        }

        next();
    };
}

module.exports = { 
    verifyToken, 
    checkRole 
};