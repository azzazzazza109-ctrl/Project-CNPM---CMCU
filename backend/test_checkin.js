/**
 * Automation Test Script: test_checkin.js
 * Mục tiêu: Tự động hóa kiểm thử API Điểm danh vé (POST /api/tickets/checkin)
 * Công cụ: Fetch API có sẵn của Node.js (Node.js v18+)
 */

const BASE_URL = 'http://localhost:3000';
const TICKET_CODE = 'TK-E1-BIT250001';

// Helper hàm tạo độ trễ (delay) giữa các test cases
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Hàm hỗ trợ đăng nhập lấy JWT Token
 * @param {string} username Email hoặc Mã sinh viên
 * @param {string} password Mật khẩu
 * @returns {Promise<string>} Token
 */
async function login(username, password) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.token) {
        throw new Error(`Đăng nhập thất bại cho user: ${username} - ${data.message || 'Lỗi không xác định'}`);
    }
    return data.token;
}

/**
 * Hàm hỗ trợ gọi API Điểm danh vé
 * @param {string|null} token JWT token (hoặc null nếu test không gửi token)
 * @param {string} ticketCode Mã vé cần điểm danh
 * @returns {Promise<{ status: number, data: any }>}
 */
async function callCheckinApi(token, ticketCode) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/api/tickets/checkin`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ticket_code: ticketCode }),
    });

    const data = await res.json();
    return { status: res.status, data };
}

/**
 * Luồng chạy chính kiểm thử tuần tự 4 Test Cases
 */
async function runTests() {
    console.log('===============================================================');
    console.log('   BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG: API CHECK-IN VÉ (4 TEST CASES)   ');
    console.log('===============================================================\n');

    let staffToken = null;
    let studentToken = null;

    try {
        console.log('[Setup] Đang chuẩn bị Token đăng nhập...');
        staffToken = await login('huong.nt@cmcu.edu.vn', '123456');
        console.log('  -> Đăng nhập STAFF thành công.');
        studentToken = await login('BIT250001', '123456');
        console.log('  -> Đăng nhập STUDENT thành công.\n');
    } catch (err) {
        console.error(' [LỖI SETUP] Không thể khởi tạo token đăng nhập:', err.message);
        console.error('Vui lòng kiểm tra lại server Backend xem đã khởi động chưa.');
        process.exit(1);
    }

    // -------------------------------------------------------------
    // Test Case 1: Điểm danh hợp lệ (STAFF quét vé REGISTERED)
    // -------------------------------------------------------------
    console.log('---------------------------------------------------------------');
    console.log('TEST CASE 1: Điểm danh hợp lệ (Staff token + Mã vé hợp lệ)');
    console.log('Kỳ vọng: HTTP 200, message "Điểm danh thành công"');
    try {
        const res = await callCheckinApi(staffToken, TICKET_CODE);
        console.log(`HTTP Status : ${res.status}`);
        console.log('Response JSON:', JSON.stringify(res.data, null, 2));

        const isStatusPass = res.status === 200;
        const isMsgPass = res.data && res.data.message === 'Điểm danh thành công';

        if (isStatusPass && isMsgPass) {
            console.log('=> KẾT QUẢ: [PASS]');
        } else {
            console.log('=> KẾT QUẢ: [FAIL] (Không đúng status 200 hoặc sai message)');
        }
    } catch (error) {
        console.log(`HTTP Status : Lỗi fetch / network: ${error.message}`);
        console.log('=> KẾT QUẢ: [FAIL]');
    }

    await sleep(1000); // Chờ 1 giây

    // -------------------------------------------------------------
    // Test Case 2: Chống quét trùng (Quét lại mã vé vừa điểm danh)
    // -------------------------------------------------------------
    console.log('\n---------------------------------------------------------------');
    console.log('TEST CASE 2: Chống quét trùng lặp (Quét lại vé đã CHECKED_IN)');
    console.log('Kỳ vọng: HTTP 400, message "Vé đã được điểm danh trước đó..."');
    try {
        const res = await callCheckinApi(staffToken, TICKET_CODE);
        console.log(`HTTP Status : ${res.status}`);
        console.log('Response JSON:', JSON.stringify(res.data, null, 2));

        const isStatusPass = res.status === 400;
        const isMsgPass = res.data && typeof res.data.message === 'string' && res.data.message.includes('Vé đã được điểm danh trước đó');

        if (isStatusPass && isMsgPass) {
            console.log('=> KẾT QUẢ: [PASS]');
        } else {
            console.log('=> KẾT QUẢ: [FAIL] (Không chặn được quét trùng hoặc sai message)');
        }
    } catch (error) {
        console.log(`HTTP Status : Lỗi fetch / network: ${error.message}`);
        console.log('=> KẾT QUẢ: [FAIL]');
    }

    await sleep(1000); // Chờ 1 giây

    // -------------------------------------------------------------
    // Test Case 3: Sai quyền (STUDENT gọi API Check-in)
    // -------------------------------------------------------------
    console.log('\n---------------------------------------------------------------');
    console.log('TEST CASE 3: Kiểm tra phân quyền (Dùng Token STUDENT)');
    console.log('Kỳ vọng: HTTP 403, message "Bạn không có quyền thực hiện thao tác này"');
    try {
        const res = await callCheckinApi(studentToken, TICKET_CODE);
        console.log(`HTTP Status : ${res.status}`);
        console.log('Response JSON:', JSON.stringify(res.data, null, 2));

        const isStatusPass = res.status === 403;
        const isMsgPass = res.data && typeof res.data.message === 'string' && res.data.message.includes('Bạn không có quyền thực hiện thao tác này');

        if (isStatusPass && isMsgPass) {
            console.log('=> KẾT QUẢ: [PASS]');
        } else {
            console.log('=> KẾT QUẢ: [FAIL] (Không chặn được quyền STUDENT)');
        }
    } catch (error) {
        console.log(`HTTP Status : Lỗi fetch / network: ${error.message}`);
        console.log('=> KẾT QUẢ: [FAIL]');
    }

    await sleep(1000); // Chờ 1 giây

    // -------------------------------------------------------------
    // Test Case 4: Không gửi Token (Thiếu Authorization Header)
    // -------------------------------------------------------------
    console.log('\n---------------------------------------------------------------');
    console.log('TEST CASE 4: Không gửi kèm Authorization Header');
    console.log('Kỳ vọng: HTTP 401, message chứa "Token không tồn tại..."');
    try {
        const res = await callCheckinApi(null, TICKET_CODE);
        console.log(`HTTP Status : ${res.status}`);
        console.log('Response JSON:', JSON.stringify(res.data, null, 2));

        const isStatusPass = res.status === 401;
        const isMsgPass = res.data && typeof res.data.message === 'string' && res.data.message.includes('Token không tồn tại');

        if (isStatusPass && isMsgPass) {
            console.log('=> KẾT QUẢ: [PASS]');
        } else {
            console.log('=> KẾT QUẢ: [FAIL] (Không chặn được request thiếu header Authorization)');
        }
    } catch (error) {
        console.log(`HTTP Status : Lỗi fetch / network: ${error.message}`);
        console.log('=> KẾT QUẢ: [FAIL]');
    }

    console.log('\n===============================================================');
    console.log('                  HOÀN THÀNH KỊCH BẢN KIỂM THỬ                  ');
    console.log('===============================================================');
}

runTests();