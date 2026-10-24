// Chặn nếu chưa đăng nhập
exports.requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để thực hiện thao tác này!' });
    }
    next();
};

// Chặn nếu không phải Admin
exports.requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.system_role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền truy cập!' });
    }
    next();
};