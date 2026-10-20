/**
 * Module Dịch vụ QR Code & Soát vé (CMCU Event Management)
 * Phụ trách: Bùi Anh Tú (Nhánh Tú)
 * Nghiệp vụ: Sinh mã định danh duy nhất và chống quét lặp
 */

const crypto = require('crypto');

// Chuỗi khóa bảo mật nội bộ phục vụ mã hóa token vé
const QR_SECRET_KEY = process.env.QR_SECRET_KEY || "CMCU_INFO2011_SECRET_2026";

/**
 * Hàm sinh chuỗi QR Token bảo mật và Mã vé ký tự dự phòng
 * @param {number} eventId - ID sự kiện
 * @param {string} studentCode - Mã sinh viên (BIT250xxx)
 */
function generateTicketQR(eventId, studentCode) {
    const timestamp = Date.now();
    // Tạo mã vé ký tự dự phòng (phục vụ nhập tay khi camera lỗi hoặc mất mạng)
    const ticketCode = `TK-E${eventId}-${studentCode}`;

    // Tạo mã băm SHA-256 an toàn gắn với sinh viên và sự kiện
    const payload = `${eventId}|${studentCode}|${timestamp}|${QR_SECRET_KEY}`;
    const qrToken = crypto.createHash('sha256').update(payload).digest('hex');

    return {
        ticket_code: ticketCode,
        qr_token: qrToken,
        generated_at: new Date(timestamp).toISOString()
    };
}

/**
 * Hàm xác thực mã QR khi quét tại cửa hội trường
 * Xử lý ngoại lệ: Báo lỗi ĐỎ nếu vé đã được quét trước đó (Anti-duplicate check)
 * @param {Object} ticket - Bản ghi vé lấy từ CSDL (bảng tickets)
 */
function verifyQRScan(ticket) {
    if (!ticket) {
        return {
            isValid: false,
            statusCode: "INVALID_TICKET",
            message: "Mã QR không hợp lệ hoặc không tồn tại trong hệ thống!"
        };
    }

    // Kiểm tra trạng thái vé: Chống quét trùng lặp
    if (ticket.checkin_status === 'CHECKED_IN') {
        return {
            isValid: false,
            statusCode: "ALREADY_CHECKED_IN",
            message: `CẢNH BÁO: Vé đã được sử dụng lúc ${ticket.checkin_time || 'trước đó'}!`,
            alertColor: "RED"
        };
    }

    if (ticket.checkin_status === 'CANCELLED') {
        return {
            isValid: false,
            statusCode: "TICKET_CANCELLED",
            message: "Vé này đã bị sinh viên hủy trước đó!",
            alertColor: "RED"
        };
    }

    // Vé hợp lệ, cho phép check-in
    return {
        isValid: true,
        statusCode: "SUCCESS",
        message: "Xác thực thành công! Mời sinh viên vào cửa.",
        alertColor: "GREEN"
    };
}

module.exports = {
    generateTicketQR,
    verifyQRScan
};