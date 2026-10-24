const crypto = require('crypto');
require('dotenv').config();

const QR_SECRET_KEY = process.env.SESSION_SECRET;

function generateTicketQR(eventId, studentCode) {
    const timestamp = Date.now();
    const ticketCode = `TK-E${eventId}-${studentCode}`;
    const payload = `${eventId}|${studentCode}|${timestamp}|${QR_SECRET_KEY}`;
    const qrToken = crypto.createHash('sha256').update(payload).digest('hex');

    return { ticket_code: ticketCode, qr_token: qrToken };
}

module.exports = { generateTicketQR };