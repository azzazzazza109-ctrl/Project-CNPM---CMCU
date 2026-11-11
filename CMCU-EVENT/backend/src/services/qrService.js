/* =============================================================
   src/services/qrService.js
   Module sinh & kiểm tra mã QR cho vé CMCU
   -------------------------------------------------------------
   • qr_token  : SHA-256 hex (64 ký tự) — không thể đoán, không thể trùng
   • ticket_code: mã dự phòng dạng TK-E{eventId}-{studentCode}
   ============================================================= */
const crypto = require('crypto');

/* Secret key — đặt trong .env khi production */
const QR_SECRET = process.env.QR_SECRET || 'CMCU-INFO2011-QR-SECRET-KEY';

/**
 * Băm SHA-256 → hex lowercase (64 ký tự)
 */
function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

/**
 * Sinh ticket_code dự phòng cho điểm danh thủ công.
 * Format: TK-E{eventId}-{studentCode}  →  vd: TK-E1-BIT250001
 */
function generateTicketCode(eventId, studentCode) {
  return `TK-E${Number(eventId)}-${studentCode}`;
}

/**
 * Sinh qr_token bảo mật cao.
 * Payload gồm: ticket_code | secret | timestamp | random nonce
 *   → Đảm bảo tính duy nhất ngay cả khi 2 sinh viên trùng mã SV (không xảy ra)
 *   → Không thể reverse từ qr_token ra ticket_code nếu không biết secret.
 */
function generateQrToken(ticketCode) {
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${ticketCode}|${QR_SECRET}|${Date.now()}|${nonce}`;
  return sha256(payload); // 64 hex chars
}

/**
 * Kiểm tra định dạng qr_token (dùng cho Bước 3 — chống đầu vào rác).
 * Việc đối soát "có trùng vé hay không" do DB đảm nhận qua UNIQUE(qr_token).
 */
function isValidQrFormat(qrToken) {
  return typeof qrToken === 'string' && /^[a-f0-9]{64}$/i.test(qrToken);
}

module.exports = {
  sha256,
  generateTicketCode,
  generateQrToken,
  isValidQrFormat,
  QR_SECRET,
};