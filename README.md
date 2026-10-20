# CMCU - Event Management & Attendance System
Hệ thống Quản trị Sự kiện & Điểm danh Tự động bằng QR Code - Đại học CMC (INFO2011)

## 1. Giới thiệu dự án
Dự án giải quyết bài toán quá tải sức chứa hội trường, hạn chế sinh viên đăng ký trái ngành/khóa, và xóa bỏ tình trạng điểm danh giấy/Google Form truyền thống bằng giải pháp thẻ vé điện tử QR Code kết hợp ứng dụng quét Camera di động (< 1.5s).

## 2. Danh sách thành viên & Phân công vai trò (Nhóm 2)
- **Trần Long** - Trưởng nhóm / Backend Lead & Kiến trúc Use Case
- **Nguyễn Thị Yến Nhi** - UI/UX Lead & QA Tester
- **Nguyễn Văn Công Minh** - Database Lead (CSDL 3NF & Transaction)
- **Trần Lâm** - Test Case Lead & Kiểm thử chéo UI/API
- **Lê Danh Lượng** - Frontend UI & Hỗ trợ Database
- **Bùi Anh Tú** - Đặc tả SRS & Module QR Scanner

## 3. Kiến trúc Công nghệ & Dữ liệu
- **Backend:** Node.js / Express
- **Database:** Microsoft SQL Server (Hệ thống 6 bảng chuẩn 3NF: `faculties`, `users`, `events`, `event_eligibility`, `tickets`, `staff_tasks`)
- **Testing:** Bộ 8 kịch bản Test Cases (TC-01 đến TC-08) kiểm soát chống Overbooking và chống quét trùng mã QR.
- **Client Scanner:** HTML5 Camera Web API
