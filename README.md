# WMS Inventory Tool - Kho BN

Công cụ hỗ trợ kiểm kê hàng ngày tại kho BN, tích hợp đồng bộ dữ liệu từ Google Sheets và Thuocsi API.

## Tính năng chính
- **Tìm kiếm SKU thông minh**: Hỗ trợ tìm theo mã SKU, tên sản phẩm hoặc vị trí kệ.
- **Đồng bộ Google Sheets**: Tải danh sách sản phẩm trực tiếp từ Sheet.
- **Tích hợp Thuocsi API**: Lấy dữ liệu tồn kho vật lý, tồn khả dụng và hình ảnh sản phẩm thời gian thực.
- **Quản lý Lot/Date**: Hỗ trợ nhập nhiều Lot cho cùng một SKU.
- **Hỗ trợ hình ảnh**: Hiển thị hình ảnh sản phẩm giúp nhận diện nhanh chóng.
- **Offline First**: Sử dụng IndexedDB và LocalStorage để lưu trữ dữ liệu tạm thời.
- **Xuất báo cáo**: Xuất dữ liệu kiểm kê ra file CSV hoặc copy vào bộ nhớ tạm.

## Hướng dẫn cài đặt

1.  Tải mã nguồn về máy.
2.  Chạy file `proxy.ps1` bằng PowerShell để khởi động máy chủ trung gian (Proxy).
3.  Mở file `index.html` trên trình duyệt Chrome.
4.  Vào phần **Cài đặt (biểu tượng bánh răng)** để nhập SID và Token lấy từ trang nội bộ Thuocsi.
5.  Nhấn **Đồng bộ** để bắt đầu.

## Yêu cầu hệ thống
- Hệ điều hành: Windows (để chạy Proxy PowerShell).
- Trình duyệt: Google Chrome (khuyên dùng).
