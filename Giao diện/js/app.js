
// Lấy các thẻ menu
const menuItems = document.querySelectorAll(".menu a");

// Xử lý trạng thái menu khi nhấn
menuItems.forEach(function(item) {

    item.addEventListener("click", function(event) {

        event.preventDefault();

        // Xóa trạng thái active cũ
        menuItems.forEach(function(menu) {
            menu.classList.remove("active");
        });

        // Thêm active cho menu được chọn
        this.classList.add("active");

    });

});

// Thông báo khi nhấn nút Xem tất cả
const viewButton = document.querySelector(".section-header button");

viewButton.addEventListener("click", function() {
    alert("Chức năng xem tất cả sự kiện sẽ được phát triển ở bước tiếp theo!");
});
