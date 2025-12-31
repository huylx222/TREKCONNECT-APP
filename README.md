# TrekConnect - Hệ thống Hỗ trợ Trekking

Ứng dụng web đầy đủ để quản lý và tổ chức các chuyến trekking tại Việt Nam.

## Tính năng chính

### Dành cho người dùng:
- ✅ Đăng ký/Đăng nhập tài khoản
- ✅ Tìm kiếm và lọc chuyến đi theo địa điểm, độ khó, giá cả
- ✅ Xem chi tiết chuyến đi
- ✅ Đăng ký tham gia chuyến đi
- ✅ Phát hiện xung đột lịch trình tự động
- ✅ Đánh giá Leader và Porter

### Dành cho Leader:
- ✅ Tạo và quản lý chuyến đi
- ✅ Duyệt/từ chối người tham gia
- ✅ Finalize chuyến đi
- ✅ Tìm kiếm Porter theo khu vực

### Dành cho Porter:
- ✅ Đăng ký làm Porter
- ✅ Quản lý khu vực phục vụ
- ✅ Nhận đánh giá từ khách hàng

### Dành cho Admin:
- ✅ Quản lý địa điểm và cung đường
- ✅ Xem Dashboard thống kê
- ✅ Xử lý báo cáo
- ✅ Quản lý đánh giá

## Công nghệ sử dụng

### Backend:
- Node.js + Express
- SQLite3 (Database)
- JWT (Authentication)
- bcryptjs (Password hashing)

### Frontend:
- React 18
- Axios (API calls)
- Lucide React (Icons)
- CSS3 (Styling)

## Cài đặt

### Yêu cầu hệ thống:
- Node.js 16+ và npm
- Git (tùy chọn)

### Bước 1: Cài đặt Backend

```bash
cd backend
npm install
```

### Bước 2: Cài đặt Frontend

```bash
cd ../frontend
npm install
```

## Chạy ứng dụng

### Cách 1: Chạy thủ công

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Backend sẽ chạy tại: http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```
Frontend sẽ tự động mở tại: http://localhost:3000

### Cách 2: Sử dụng script tự động (Linux/Mac)

```bash
chmod +x start.sh
./start.sh
```

### Cách 3: Sử dụng script tự động (Windows)

```bash
start.bat
```

## Tài khoản mặc định

### Admin:
- Email: admin@trekconnect.vn
- Password: password123

### User (Leader):
- Email: long@email.com
- Password: password123

### Porter:
- Email: leb@email.com
- Password: password123

## Cấu trúc Database

Database được tự động khởi tạo khi chạy backend lần đầu với dữ liệu mẫu bao gồm:
- 3 địa điểm (Lào Cai, Lâm Đồng, Nghệ An)
- 3 cung đường (Fansipan, Sa Mu - U Bò, Tà Năng - Phan Dũng)
- 4 người dùng (1 Admin, 2 User/Leader, 1 Porter)
- 2 chuyến đi mẫu

## API Endpoints

### Authentication
- POST `/api/auth/register` - Đăng ký
- POST `/api/auth/login` - Đăng nhập
- GET `/api/auth/me` - Lấy thông tin user

### Locations & Trails
- GET `/api/locations` - Danh sách địa điểm
- POST `/api/locations` - Tạo địa điểm (Admin)
- GET `/api/trails` - Danh sách cung đường
- POST `/api/trails` - Tạo cung đường (Admin)

### Trips
- GET `/api/trips` - Danh sách chuyến đi (có filter)
- GET `/api/trips/:id` - Chi tiết chuyến đi
- POST `/api/trips` - Tạo chuyến đi
- PUT `/api/trips/:id` - Cập nhật chuyến đi
- DELETE `/api/trips/:id` - Hủy chuyến đi

### Participations
- GET `/api/trips/:id/participants` - Danh sách người tham gia
- POST `/api/trips/:id/join` - Đăng ký tham gia
- PUT `/api/participations/:id` - Duyệt/Từ chối
- DELETE `/api/participations/:id` - Hủy tham gia

### Porters
- GET `/api/porters` - Danh sách Porter
- GET `/api/porters/:id` - Chi tiết Porter

### Ratings
- GET `/api/ratings` - Danh sách đánh giá
- POST `/api/ratings` - Tạo đánh giá

### Reports
- GET `/api/reports` - Danh sách báo cáo (Admin)
- POST `/api/reports` - Tạo báo cáo
- PUT `/api/reports/:id` - Xử lý báo cáo (Admin)

### Statistics
- GET `/api/stats/overview` - Thống kê tổng quan (Admin)

## Tính năng nâng cao

### 1. Phát hiện xung đột lịch trình
Hệ thống tự động kiểm tra và ngăn chặn người dùng đăng ký 2 chuyến đi trùng thời gian.

### 2. Quản lý trạng thái chuyến đi
- Draft: Nháp
- Pending: Đang mở đăng ký
- Finalized: Đã chốt danh sách
- In Process: Đang diễn ra
- Completed: Hoàn thành
- Canceled: Đã hủy

### 3. Hệ thống đánh giá
- Đánh giá Porter (1-5 sao)
- Đánh giá Leader (1-5 sao)
- Tính điểm trung bình tự động

### 4. Báo cáo vi phạm
- Báo cáo User
- Báo cáo Trip
- Admin xử lý: Done/Dismissed

## Troubleshooting

### Lỗi: "EADDRINUSE: address already in use"
Port 3001 hoặc 3000 đang được sử dụng. Thay đổi port trong:
- Backend: `backend/server.js` (dòng `const PORT = 3001`)
- Frontend: `frontend/package.json` (thêm PORT=3002 vào script start)

### Lỗi: "Cannot find module"
Chạy lại `npm install` trong thư mục tương ứng.

### Database bị lỗi
Xóa file `backend/trekconnect.db` và khởi động lại backend để tạo database mới.

## Phát triển thêm

### Thêm tính năng mới:
1. Thêm route trong `backend/server.js`
2. Thêm component trong `frontend/src/App.js`
3. Cập nhật CSS trong `frontend/src/App.css`

### Thêm bảng database mới:
1. Cập nhật schema trong `backend/database.js`
2. Xóa database cũ để tạo lại

## License

Dự án học tập - Nguyễn Kim Long - MSSV: 20185379
Đại học Bách Khoa Hà Nội

## Liên hệ

- Email: info@trekconnect.vn
- GitHub: [TrekConnect]
