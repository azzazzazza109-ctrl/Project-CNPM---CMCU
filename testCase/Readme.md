# MA TRẬN KỊCH BẢN KIỂM THỬ HỆ THỐNG (TEST CASE MATRIX)

- **Hệ thống:** Quản trị Sự kiện & Điểm danh Tự động bằng QR Code (CMCU)
- **Công nghệ:** ReactJS (Frontend) - Node.js/Express (Backend) - SQL Server (Database)
- **Người thực hiện (QA / Tester):** Trần Lâm (Nhóm trưởng)
- **Đối soát:** Source Code thực tế, API Backend & Database Schema

---

## BẢNG MA TRẬN KIỂM THỬ

| Test Case ID | Tên Kịch Bản Kiểm Thử | Điều Kiện Tiền Đề & Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Kỳ Vọng (Expected Output) | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Đăng nhập và Phân quyền chuyển hướng | Tài khoản Admin (`admin@cmcu.edu.vn`) và Sinh viên (`long@cmcu.edu.vn`). | 1. Đăng nhập bằng tài khoản Admin.<br>2. Đăng xuất.<br>3. Đăng nhập bằng tài khoản Sinh viên. | 1. Admin được chuyển hướng vào `/admin`.<br>2. Sinh viên được chuyển hướng về trang chủ `/` (Đăng ký vé). | **PASS** |
| **TC-02** | Chặn truy cập trái phép vào trang Admin | Tài khoản đang đăng nhập là Sinh viên (không phải ADMIN). | 1. Trên thanh địa chỉ, gõ trực tiếp đường dẫn `http://localhost:5173/admin`. | Hệ thống hiển thị cảnh báo "Bạn không có quyền truy cập!" và tự động đá văng về trang `/login`. | **PASS** |
| **TC-03** | Đăng ký vé thành công | Tài khoản SV hợp lệ. Sự kiện đang ở trạng thái OPEN, còn chỗ trống. | 1. Chọn Sự kiện từ Dropdown.<br>2. Bấm "Đăng ký ngay". | Hệ thống báo Đăng ký thành công, hiển thị Mã vé (`TK-Ex-MaSV`) và Mã QR Code. Trạng thái vé ở cột "Vé của tôi" là `REGISTERED`. | **PASS** |
| **TC-04** | Chặn đăng ký trùng lặp (1 SV = 1 Vé) | Sinh viên đã có vé trạng thái `REGISTERED` cho Sự kiện A. | 1. Chọn lại Sự kiện A.<br>2. Bấm "Đăng ký ngay" lần 2. | Hệ thống chặn lại, hiển thị thông báo màu đỏ: "Bạn đã đăng ký vé này rồi!". | **PASS** |
| **TC-05** | Hủy vé hợp lệ | Sinh viên có vé trạng thái `REGISTERED` (chưa check-in). | 1. Vào cột "Vé của tôi".<br>2. Bấm "Hủy vé này" và xác nhận. | Vé chuyển trạng thái sang `CANCELLED` (màu đỏ). Nút "Hủy vé" biến mất. | **PASS** |
| **TC-06** | Đăng ký lại vé đã hủy (Cơ chế hồi sinh vé) | Sinh viên đã hủy vé Sự kiện A (vé đang `CANCELLED`). | 1. Chọn lại Sự kiện A.<br>2. Bấm "Đăng ký ngay". | Hệ thống không báo lỗi trùng lặp. Vé cũ được hồi sinh, cập nhật mã QR mới và trạng thái quay về `REGISTERED`. | **PASS** |
| **TC-07** | Quét mã QR điểm danh thành công tại cửa | Vé đang `REGISTERED`. Nhân viên dùng Camera hoặc nhập mã thủ công. | 1. Mở trang `/scanner`.<br>2. Quét mã QR (hoặc nhập `TK-Ex-MaSV`). | Màn hình nháy Xanh: "Điểm danh thành công". Database cập nhật `checkin_status = CHECKED_IN` và lưu `checkin_time`. | **PASS** |
| **TC-08** | Chống quét trùng lặp mã QR (Anti-duplicate) | Vé đã được check-in thành công trước đó (đang `CHECKED_IN`). | 1. Nhân viên tiếp tục quét lại mã QR này lần thứ 2. | Màn hình nháy Đỏ cảnh báo: "CẢNH BÁO: Vé đã được sử dụng lúc [Giờ]". Không ghi đè thời gian. | **PASS** |
| **TC-09** | Admin tạo Sự kiện mới | Tài khoản đăng nhập là ADMIN. | 1. Vào trang `/admin`.<br>2. Nhập Tên sự kiện, Sức chứa.<br>3. Bấm "+ Thêm Mới". | Sự kiện mới được lưu vào DB. Bảng quản lý Sự kiện cập nhật thêm dòng mới. Dropdown ở trang Sinh viên có thêm sự kiện này. | **PASS** |
| **TC-10** | Admin cập nhật thông tin Sự kiện | Sự kiện đã tồn tại trong hệ thống. | 1. Tại bảng Sự kiện, bấm nút "Sửa" (màu vàng).<br>2. Đổi Tên/Sức chứa, bấm "Lưu Thay Đổi". | Form tự động điền dữ liệu cũ. Sau khi lưu, thông tin sự kiện được cập nhật mới trong bảng và Database. | **PASS** |
| **TC-11** | Admin xóa Sự kiện (Cascade Delete) | Sự kiện đã có sinh viên đăng ký vé. | 1. Tại bảng Sự kiện, bấm nút "Xóa" (màu đỏ).<br>2. Xác nhận cảnh báo. | Sự kiện bị xóa khỏi hệ thống. Toàn bộ vé của sự kiện này cũng tự động bị xóa để bảo toàn dữ liệu (tránh lỗi khóa ngoại). | **PASS** |
| **TC-12** | Admin sửa thông tin Sinh viên | Tài khoản đăng nhập là ADMIN. | 1. Tại bảng Người dùng, bấm nút "Sửa".<br>2. Thay đổi Họ tên, Email.<br>3. Bấm OK. | Thông tin sinh viên được cập nhật thành công vào Database và hiển thị lại trên bảng. | **PASS** |
| **TC-13** | Admin xóa/hủy vé của Sinh viên | Admin muốn thu hồi vé của một sinh viên vi phạm. | 1. Tại bảng Danh sách Vé, tìm vé cần xóa.<br>2. Bấm nút "Hủy/Xóa" (màu đỏ). | Vé bị xóa hoàn toàn khỏi Database. Sinh viên đó có thể đăng ký lại vé mới cho sự kiện này. | **PASS** |
| **TC-14** | Ngăn chặn truy cập khi chưa Đăng nhập | Người dùng chưa đăng nhập (hoặc đã xóa LocalStorage). | 1. Gõ trực tiếp `http://localhost:5173/` (Trang sinh viên). | Hệ thống gọi API `/auth/me` thất bại (401) và lập tức điều hướng người dùng về trang `/login`. | **PASS** |

---

## GHI CHÚ KỸ THUẬT (DÀNH CHO BÁO CÁO)

* **Về ràng buộc dữ liệu:** Hệ thống kết hợp chặt chẽ giữa ràng buộc Database (UNIQUE key `uq_event_student` đảm bảo 1 SV chỉ có 1 vé/sự kiện) và logic kiểm tra ở Backend (Cơ chế hồi sinh vé `CANCELLED` thành `REGISTERED`).
* **Về bảo mật:** Hệ thống sử dụng `express-session` để quản lý phiên đăng nhập. Có các Middleware (`requireLogin`, `requireAdmin`) chặn đứng các request gọi API trực tiếp từ Postman nếu không có quyền hợp lệ.
* **Về UI/UX:** Ứng dụng được thiết kế Responsive bằng Tailwind CSS, đảm bảo hiển thị tốt trên cả màn hình máy tính và điện thoại (phục vụ cho nhân viên soát vé cầm đi lại).