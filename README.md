# 🌟 DỰ ÁN CMCU: HỆ THỐNG QUẢN TRỊ SỰ KIỆN & ĐIỂM DANH TỰ ĐỘNG BẰNG QR CODE

> *“Công nghệ không chỉ giúp chúng ta làm việc hiệu quả hơn, mà còn tạo điều kiện để những khoảnh khắc kết nối trở nên trọn vẹn hơn.”*

## 🕊️ 1. Bối cảnh và mục tiêu dự án

Trong môi trường đại học, các hoạt động như hội thảo, workshop và chương trình Đoàn – Hội là cơ hội để sinh viên học hỏi, giao lưu và phát triển kỹ năng. Tuy nhiên, việc tổ chức và quản lý những sự kiện này đôi khi vẫn phụ thuộc vào Google Forms, danh sách Excel và hình thức điểm danh thủ công.

Cách làm trên có thể dẫn đến nhiều bất cập như khó kiểm soát số lượng đăng ký, mất thời gian chờ check-in, phát sinh tình trạng điểm danh hộ và tốn công tổng hợp dữ liệu sau sự kiện.

Xuất phát từ những vấn đề thực tế đó, nhóm phát triển dự án **CMCU – Hệ thống Quản trị Sự kiện & Điểm danh Tự động bằng QR Code**, hướng đến việc ứng dụng công nghệ để đơn giản hóa quy trình tổ chức, nâng cao hiệu quả quản lý và cải thiện trải nghiệm của sinh viên.

Dự án tập trung vào ba mục tiêu chính:

- **Nâng cao trải nghiệm sinh viên:** Hỗ trợ tra cứu sự kiện, đăng ký tham gia, quản lý vé điện tử và chủ động theo dõi trạng thái đăng ký.
- **Tối ưu quy trình vận hành:** Giúp Ban Tổ chức quản lý sự kiện, kiểm soát sức chứa và thực hiện check-in bằng mã QR hoặc tra cứu thủ công.
- **Tăng tính chính xác và minh bạch:** Hạn chế đăng ký trùng lặp, hỗ trợ ghi nhận lượt tham gia và tạo dữ liệu phục vụ công tác tổng hợp, báo cáo.

## ✨ 2. Các chức năng cốt lõi

Hệ thống được thiết kế theo từng nhóm người dùng, tương ứng với những nhu cầu và nhiệm vụ cụ thể.

### 2.1. Dành cho sinh viên

- **Tra cứu và lọc sự kiện:** Xem danh sách, tìm kiếm và lọc sự kiện theo các điều kiện như khóa học, khoa/viện và trạng thái sự kiện.
- **Đăng ký tham gia:** Đăng ký vé điện tử, kiểm soát số lượng chỗ còn lại và hạn chế tình trạng một sinh viên đăng ký nhiều vé cho cùng một sự kiện.
- **Quản lý vé điện tử:** Xem thông tin vé, mã QR và chuỗi mã dự phòng trong mục “Vé của tôi”. Khả năng sử dụng khi không có mạng phụ thuộc vào cơ chế lưu trữ và xác thực được triển khai.
- **Hủy đăng ký:** Cho phép sinh viên hủy vé theo thời hạn và quy định của từng sự kiện.
- **Theo dõi lịch sử:** Xem các sự kiện đã đăng ký cùng trạng thái vé và thông tin tham gia.

### 2.2. Dành cho nhân viên Ban Tổ chức

- **Check-in bằng mã QR:** Sử dụng camera thiết bị để quét mã, tra cứu thông tin vé và xác nhận trạng thái tham gia.
- **Tra cứu thủ công:** Hỗ trợ tìm kiếm bằng mã sinh viên trong trường hợp không thể sử dụng mã QR.
- **Kiểm soát điểm danh:** Kiểm tra trạng thái vé, hạn chế ghi nhận trùng lặp và lưu thông tin phục vụ đối soát sau sự kiện.

### 2.3. Dành cho Trưởng Ban Tổ chức và Quản trị viên

- **Quản lý sự kiện:** Tạo, cập nhật thông tin, thiết lập sức chứa và cấu hình điều kiện tham gia.
- **Quản lý công việc:** Phân công nhiệm vụ, theo dõi thời hạn và trạng thái thực hiện của các thành viên Ban Tổ chức.
- **Tổng hợp báo cáo:** Trích xuất dữ liệu đăng ký và điểm danh để phục vụ công tác thống kê, đối soát và báo cáo cho bộ phận phụ trách.

## 🏛️ 3. Thiết kế cơ sở dữ liệu

Cơ sở dữ liệu của CMCU được tổ chức thành sáu bảng chính, tương ứng với các nhóm dữ liệu và nghiệp vụ của hệ thống:

1. **FACULTIES:** Lưu thông tin khoa/viện.
2. **USERS:** Quản lý thông tin sinh viên, nhân viên và quản trị viên.
3. **EVENTS:** Lưu thông tin sự kiện, thời gian, địa điểm, sức chứa và trạng thái.
4. **EVENT_ELIGIBILITY:** Lưu các điều kiện tham gia sự kiện theo khóa học và khoa/viện.
5. **TICKETS:** Quản lý vé điện tử, mã QR và trạng thái check-in.
6. **STAFF_TASKS:** Quản lý công việc, người phụ trách, thời hạn và tiến độ thực hiện.

Các bảng được liên kết bằng khóa chính và khóa ngoại nhằm duy trì tính nhất quán của dữ liệu. Đặc biệt, ràng buộc `UNIQUE(event_id, student_id)` trong bảng `TICKETS` ngăn một sinh viên có nhiều bản ghi vé cho cùng một sự kiện.

Cấu trúc dữ liệu được thiết kế theo hướng chuẩn hóa. Việc khẳng định cơ sở dữ liệu đạt chuẩn 3NF cần dựa trên phân tích khóa, phụ thuộc hàm và các quan hệ giữa thuộc tính.

## 🔄 4. Quy trình hoạt động tổng quát

Quy trình sử dụng hệ thống được định hướng theo các bước sau:

1. **Công bố sự kiện:** Ban Tổ chức tạo sự kiện, thiết lập sức chứa và điều kiện tham gia.
2. **Tra cứu và đăng ký:** Sinh viên tìm kiếm sự kiện phù hợp, kiểm tra thông tin và đăng ký vé.
3. **Cấp và quản lý vé:** Hệ thống ghi nhận đăng ký, tạo thông tin vé điện tử và mã QR tương ứng.
4. **Check-in tại sự kiện:** Nhân viên quét mã QR hoặc tra cứu mã sinh viên để xác nhận vé hợp lệ.
5. **Tổng hợp kết quả:** Dữ liệu đăng ký và điểm danh được sử dụng để thống kê, đối soát và lập báo cáo.

Các quy tắc về sức chứa, thời hạn hủy vé, điều kiện tham gia và chống check-in trùng cần được triển khai và kiểm thử để bảo đảm quy trình hoạt động đúng yêu cầu.

## 🌸 5. Giá trị và định hướng phát triển

CMCU hướng đến việc giải quyết những khó khăn thường gặp trong công tác tổ chức sự kiện tại môi trường đại học bằng một quy trình quản lý tập trung và có khả năng kiểm soát tốt hơn.

Đối với sinh viên, hệ thống giúp việc tìm kiếm, đăng ký và quản lý vé thuận tiện hơn. Đối với Ban Tổ chức, hệ thống hỗ trợ giảm thao tác thủ công, hạn chế sai sót trong khâu điểm danh và đơn giản hóa việc tổng hợp dữ liệu.

Trong quá trình phát triển, nhóm sẽ tiếp tục hoàn thiện các chức năng, kiểm thử những tình huống thực tế và đánh giá hiệu quả vận hành. Những tính năng như xác thực ngoại tuyến, bảo mật mã QR và tích hợp dữ liệu điểm rèn luyện cần được xem xét dựa trên yêu cầu nghiệp vụ và khả năng triển khai thực tế.

CMCU không chỉ là một bài tập xây dựng phần mềm, mà còn là cơ hội để nhóm vận dụng kiến thức Công nghệ thông tin vào một bài toán thực tiễn, rèn luyện tư duy phân tích, kỹ năng làm việc nhóm và khả năng phát triển sản phẩm hướng đến người dùng.

*Với CMCU, nhóm mong muốn góp phần xây dựng một môi trường tổ chức sự kiện thuận tiện, minh bạch và hiệu quả hơn, để công nghệ thực sự phục vụ con người và những kết nối trong đời sống sinh viên.*
