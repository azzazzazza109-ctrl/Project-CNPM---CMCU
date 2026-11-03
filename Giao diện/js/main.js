
/* =====================================
   1. DỮ LIỆU SỰ KIỆN
===================================== */

const events = [
    {
        id: 1,
        name: "Ngày hội công nghệ sinh viên",
        category: "Công nghệ",
        date: "2026-11-15",
        time: "08:00 - 11:30",
        location: "Hội trường A",
        capacity: 200,
        registered: 125,
        description: "Ngày hội công nghệ là nơi sinh viên khám phá các xu hướng công nghệ mới, giao lưu với chuyên gia và tìm hiểu những sản phẩm sáng tạo.",
        requirements: "Sinh viên đang theo học tại trường.",
        image: "image-one",
        status: "Đang mở đăng ký"
    },
    {
        id: 2,
        name: "Workshop định hướng nghề nghiệp",
        category: "Học thuật",
        date: "2026-11-20",
        time: "13:30 - 16:00",
        location: "Phòng B203",
        capacity: 100,
        registered: 75,
        description: "Chương trình giúp sinh viên hiểu rõ định hướng nghề nghiệp, kỹ năng cần thiết và cơ hội việc làm trong tương lai.",
        requirements: "Sinh viên năm nhất đến năm tư.",
        image: "image-two",
        status: "Đang mở đăng ký"
    },
    {
        id: 3,
        name: "Cuộc thi lập trình sinh viên",
        category: "Công nghệ",
        date: "2026-11-25",
        time: "07:30 - 17:00",
        location: "Phòng Lab 01",
        capacity: 80,
        registered: 80,
        description: "Cuộc thi lập trình dành cho sinh viên yêu thích thuật toán, tư duy logic và phát triển phần mềm.",
        requirements: "Sinh viên có kiến thức lập trình cơ bản.",
        image: "image-three",
        status: "Đã đủ chỗ"
    },
    {
        id: 4,
        name: "Ngày hội hiến máu nhân đạo",
        category: "Tình nguyện",
        date: "2026-12-02",
        time: "07:00 - 11:00",
        location: "Nhà đa năng",
        capacity: 150,
        registered: 60,
        description: "Hoạt động tình nguyện nhằm lan tỏa tinh thần sẻ chia và đóng góp cho cộng đồng.",
        requirements: "Người tham gia đáp ứng điều kiện sức khỏe hiến máu.",
        image: "image-one",
        status: "Đang mở đăng ký"
    },
    {
        id: 5,
        name: "Giao lưu câu lạc bộ sinh viên",
        category: "Giao lưu",
        date: "2026-12-05",
        time: "14:00 - 17:00",
        location: "Sân trường",
        capacity: 300,
        registered: 120,
        description: "Cơ hội tìm hiểu các câu lạc bộ, kết bạn và tham gia các hoạt động ngoại khóa.",
        requirements: "Dành cho sinh viên toàn trường.",
        image: "image-two",
        status: "Đang mở đăng ký"
    },
    {
        id: 6,
        name: "Hội thảo trí tuệ nhân tạo",
        category: "Công nghệ",
        date: "2026-12-10",
        time: "08:00 - 11:00",
        location: "Hội trường B",
        capacity: 120,
        registered: 45,
        description: "Tìm hiểu ứng dụng trí tuệ nhân tạo trong học tập, nghiên cứu và phát triển phần mềm.",
        requirements: "Sinh viên quan tâm đến công nghệ AI.",
        image: "image-three",
        status: "Đang mở đăng ký"
    }
];


/* =====================================
   2. KHAI BÁO CÁC PHẦN TỬ HTML
===================================== */

const pageContent = document.getElementById("page-content");
const pageTitle = document.getElementById("page-title");
const menuItems = document.querySelectorAll(".menu-item");
const sidebar = document.querySelector(".sidebar");
const menuToggle = document.getElementById("menu-toggle");

let currentPage = "dashboard";
let selectedEventId = null;

// Thông tin sinh viên dùng để mô phỏng
const currentStudent = {
    id: "SV001",
    name: "Nguyễn Văn A",
    major: "Công nghệ thông tin",
    year: 2
};

// Lấy dữ liệu đăng ký đã lưu
let registrations = JSON.parse(
    localStorage.getItem("studentRegistrations") || "[]"
);


/* =====================================
   3. HÀM LƯU ĐĂNG KÝ
===================================== */

function saveRegistrations() {
    localStorage.setItem(
        "studentRegistrations",
        JSON.stringify(registrations)
    );
}


/* =====================================
   4. ĐỊNH DẠNG NGÀY THÁNG
===================================== */

function formatDate(date) {
    return new Date(date + "T00:00:00").toLocaleDateString("vi-VN");
}


/* =====================================
   5. TẠO THẺ SỰ KIỆN
===================================== */

function createEventCard(event) {

    const isRegistered = registrations.some(
        item => item.eventId === event.id
    );

    return `
        <div class="event-card">

            <div class="event-image ${event.image}">
                ${event.category.toUpperCase()}
            </div>

            <div class="event-content">

                <span class="event-status">
                    ${event.status}
                </span>

                <h3>${event.name}</h3>

                <p>Ngày: ${formatDate(event.date)}</p>

                <p>Địa điểm: ${event.location}</p>

                <p>Số chỗ còn lại: ${event.capacity - event.registered}</p>

                <div class="event-actions">

                    <button class="detail-button"
                        data-action="detail"
                        data-id="${event.id}">
                        Chi tiết
                    </button>

                    <button class="register-button"
                        data-action="register"
                        data-id="${event.id}"
                        ${isRegistered || event.registered >= event.capacity ? "disabled" : ""}>
                        ${isRegistered ? "Đã đăng ký" : event.registered >= event.capacity ? "Hết chỗ" : "Đăng ký"}
                    </button>

                </div>

            </div>

        </div>
    `;
}


/* =====================================
   6. TRANG CHỦ
===================================== */

function renderDashboard() {

    pageTitle.textContent = "Tổng quan";

    const totalRegistered = events.reduce(
        (total, event) => total + event.registered, 0
    );

    const upcomingEvents = events.filter(
        event => new Date(event.date + "T00:00:00") >= new Date(new Date().toDateString())
    );

    const featuredEvents = upcomingEvents.slice(0, 3);

    pageContent.innerHTML = `

        <div class="welcome">
            <h1>Tổng quan hệ thống</h1>
            <p>Theo dõi hoạt động và quản lý sự kiện sinh viên.</p>
        </div>

        <div class="statistics">

            <div class="stat-card">
                <p>Tổng số sự kiện</p>
                <h2>${events.length}</h2>
                <span>Đang được quản lý</span>
            </div>

            <div class="stat-card">
                <p>Lượt đăng ký</p>
                <h2>${totalRegistered}</h2>
                <span>Tổng lượt đăng ký</span>
            </div>

            <div class="stat-card">
                <p>Sự kiện sắp diễn ra</p>
                <h2>${upcomingEvents.length}</h2>
                <span>Trong thời gian tới</span>
            </div>

            <div class="stat-card">
                <p>Vé của tôi</p>
                <h2>${registrations.length}</h2>
                <span>Sự kiện đã đăng ký</span>
            </div>

        </div>

        <div class="section-header">
            <div>
                <h2>Sự kiện nổi bật</h2>
                <p>Những sự kiện đang được quan tâm</p>
            </div>

            <button class="primary-button" data-action="events">
                Xem tất cả
            </button>
        </div>

        <div class="event-list">
            ${featuredEvents.map(createEventCard).join("")}
        </div>
    `;
}


/* =====================================
   7. DANH SÁCH SỰ KIỆN
===================================== */

function renderEvents() {

    pageTitle.textContent = "Danh sách sự kiện";

    pageContent.innerHTML = `

        <div class="welcome">
            <h1>Danh sách sự kiện</h1>
            <p>Tìm kiếm và đăng ký các sự kiện của trường.</p>
        </div>

        <div class="search-area">

            <input
                type="text"
                id="event-search"
                placeholder="Nhập tên sự kiện cần tìm..."
            >

            <select id="category-filter">
                <option value="all">Tất cả danh mục</option>
                <option value="Công nghệ">Công nghệ</option>
                <option value="Học thuật">Học thuật</option>
                <option value="Tình nguyện">Tình nguyện</option>
                <option value="Giao lưu">Giao lưu</option>
            </select>

        </div>

        <p class="result-count" id="result-count"></p>

        <div class="event-list" id="all-events">
            ${events.map(createEventCard).join("")}
        </div>
    `;

    filterEvents();
}


/* =====================================
   8. TÌM KIẾM VÀ LỌC SỰ KIỆN
===================================== */

function filterEvents() {

    const searchInput = document.getElementById("event-search");
    const categoryFilter = document.getElementById("category-filter");

    if (!searchInput || !categoryFilter) return;

    const keyword = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;

    const filteredEvents = events.filter(event => {

        const matchName = event.name.toLowerCase().includes(keyword);

        const matchCategory =
            category === "all" || event.category === category;

        return matchName && matchCategory;
    });

    document.getElementById("all-events").innerHTML =
        filteredEvents.length
            ? filteredEvents.map(createEventCard).join("")
            : "<p>Không tìm thấy sự kiện phù hợp.</p>";

    document.getElementById("result-count").textContent =
        `Tìm thấy ${filteredEvents.length} sự kiện`;
}


/* =====================================
   9. KHÁM PHÁ SỰ KIỆN
===================================== */

function renderDiscover() {

    pageTitle.textContent = "Khám phá sự kiện";

    pageContent.innerHTML = `

        <div class="welcome">
            <h1>Khám phá sự kiện</h1>
            <p>Tìm những hoạt động phù hợp với sở thích của bạn.</p>
        </div>

        <div class="category-list">

            <button class="category-button active"
                data-category="all">Tất cả</button>

            <button class="category-button"
                data-category="Công nghệ">Công nghệ</button>

            <button class="category-button"
                data-category="Học thuật">Học thuật</button>

            <button class="category-button"
                data-category="Tình nguyện">Tình nguyện</button>

            <button class="category-button"
                data-category="Giao lưu">Giao lưu</button>

        </div>

        <div class="event-list" id="all-events">
            ${events.map(createEventCard).join("")}
        </div>
    `;
}


/* =====================================
   10. CHI TIẾT SỰ KIỆN
===================================== */

function renderEventDetail(id) {

    const event = events.find(item => item.id === id);

    if (!event) return;

    selectedEventId = id;

    pageTitle.textContent = "Chi tiết sự kiện";

    const isRegistered = registrations.some(
        item => item.eventId === id
    );

    const remaining = event.capacity - event.registered;

    pageContent.innerHTML = `

        <button class="back-button" data-action="back">
            ← Quay lại danh sách
        </button>

        <div class="detail-container">

            <div class="detail-banner ${event.image}">
                <h1>${event.name}</h1>
            </div>

            <div class="detail-body">

                <span class="event-status">${event.status}</span>

                <h2>Thông tin sự kiện</h2>

                <p><strong>Danh mục:</strong> ${event.category}</p>

                <p><strong>Ngày tổ chức:</strong> ${formatDate(event.date)}</p>

                <p><strong>Thời gian:</strong> ${event.time}</p>

                <p><strong>Địa điểm:</strong> ${event.location}</p>

                <p><strong>Sức chứa:</strong> ${event.capacity} sinh viên</p>

                <p><strong>Số chỗ còn lại:</strong> ${remaining}</p>

                <h2>Giới thiệu chương trình</h2>

                <p>${event.description}</p>

                <h2>Điều kiện đăng ký</h2>

                <p>${event.requirements}</p>

                <button class="register-button"
                    data-action="register"
                    data-id="${event.id}"
                    ${isRegistered || remaining <= 0 ? "disabled" : ""}>
                    ${isRegistered ? "Bạn đã đăng ký" : remaining <= 0 ? "Đã hết chỗ" : "Đăng ký tham gia"}
                </button>

            </div>

        </div>
    `;
}


/* =====================================
   11. XỬ LÝ ĐĂNG KÝ
===================================== */

function registerEvent(id) {

    const event = events.find(item => item.id === id);

    if (!event) return;

    // Kiểm tra đã đăng ký chưa
    const alreadyRegistered = registrations.some(
        item => item.eventId === id
    );

    if (alreadyRegistered) {
        alert("Bạn đã đăng ký sự kiện này rồi!");
        return;
    }

    // Kiểm tra số lượng chỗ
    if (event.registered >= event.capacity) {
        alert("Sự kiện đã hết chỗ!");
        return;
    }

    // Tạo thông tin đăng ký
    const registration = {
        registrationId: Date.now(),
        eventId: event.id,
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        registrationDate: new Date().toISOString(),
        status: "Đã đăng ký"
    };

    // Lưu thông tin
    registrations.push(registration);

    event.registered++;

    saveRegistrations();

    alert("Đăng ký sự kiện thành công!");

    // Cập nhật giao diện
    if (currentPage === "detail") {
        renderEventDetail(id);
    } else if (currentPage === "events") {
        renderEvents();
    } else if (currentPage === "discover") {
        renderDiscover();
    } else {
        renderDashboard();
    }
}


/* =====================================
   12. ĐIỀU HƯỚNG CÁC TRANG
===================================== */

function navigateTo(page) {

    currentPage = page;

    menuItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === page
        );
    });

    switch (page) {

        case "dashboard":
            renderDashboard();
            break;

        case "events":
            renderEvents();
            break;

        case "discover":
            renderDiscover();
            break;

        default:
            pageTitle.textContent = "Chức năng đang phát triển";
            pageContent.innerHTML = `
                <div class="welcome">
                    <h1>Chức năng đang phát triển</h1>
                    <p>Chức năng này sẽ được xây dựng ở giai đoạn tiếp theo.</p>
                </div>
            `;
    }

    sidebar.classList.remove("show");
}


/* =====================================
   13. XỬ LÝ SỰ KIỆN CLICK
===================================== */

document.addEventListener("click", function(event) {

    const menu = event.target.closest(".menu-item");

    if (menu) {
        event.preventDefault();
        navigateTo(menu.dataset.page);
        return;
    }

    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const id = Number(button.dataset.id);

    if (action === "events") {
        navigateTo("events");
    }

    if (action === "detail") {
        currentPage = "detail";
        renderEventDetail(id);
    }

    if (action === "register") {
        registerEvent(id);
    }

    if (action === "back") {
        navigateTo("events");
    }

    if (action === "category") {
        renderDiscover();

        const category = button.dataset.category;

        const filteredEvents = category === "all"
            ? events
            : events.filter(item => item.category === category);

        document.getElementById("all-events").innerHTML =
            filteredEvents.map(createEventCard).join("");

        document.querySelectorAll(".category-button").forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset.category === category
            );
        });
    }

});


/* =====================================
   14. XỬ LÝ TÌM KIẾM
===================================== */

document.addEventListener("input", function(event) {

    if (event.target.id === "event-search") {
        filterEvents();
    }

});

document.addEventListener("change", function(event) {

    if (event.target.id === "category-filter") {
        filterEvents();
    }

});


/* =====================================
   15. SIDEBAR TRÊN ĐIỆN THOẠI
===================================== */

menuToggle.addEventListener("click", function() {

    sidebar.classList.toggle("show");

});


/* =====================================
   16. KHỞI CHẠY WEBSITE
===================================== */

renderDashboard();
