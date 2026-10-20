const express = require('express');
const router = express.Router();

/**
 * Tuyến API: Đăng ký vé sự kiện
 * POST /api/tickets/register
 * Nghiệp vụ: Kiểm tra điều kiện Khóa/Khoa và cấp 1 vé duy nhất
 */
router.post('/register', async (req, res) => {
    const { event_id, student_id, student_code, cohort, faculty_id } = req.body;

    try {
        if (!event_id || !student_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Thiếu thông tin mã sự kiện hoặc mã định danh sinh viên." 
            });
        }

        // Logic mô phỏng kiểm tra ràng buộc 1 SV = 1 Vé duy nhất
        const ticketCode = `TK-${event_id}-${student_code || student_id}`;
        
        return res.status(201).json({
            success: true,
            message: "Đăng ký vé tham dự sự kiện thành công.",
            data: {
                ticket_code: ticketCode,
                event_id: event_id,
                student_id: student_id,
                checkin_status: "REGISTERED",
                registered_at: new Date().toISOString()
            }
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Lỗi hệ thống khi đăng ký vé: " + error.message 
        });
    }
});

/**
 * Tuyến API: Hủy vé trước giờ G
 * POST /api/tickets/cancel
 */
router.post('/cancel', async (req, res) => {
    const { ticket_id, student_id } = req.body;
    
    return res.status(200).json({
        success: true,
        message: "Hủy vé thành công, vị trí đã được giải phóng.",
        ticket_id: ticket_id,
        checkin_status: "CANCELLED"
    });
});

module.exports = router;