-- ============================================================================
-- SMARTPARK ĐÀ NẴNG - ENTERPRISE PARKING MANAGEMENT DATABASE SCHEMA
-- Hệ Thống Quản Trị & Vận Hành Bãi Xe Thông Minh Chuẩn Doanh Nghiệp
-- ============================================================================

-- schema.sql – Bản thiết kế DDL Toàn diện của Cơ sở dữ liệu
-- Chức năng: Định nghĩa toàn bộ 12 bảng thực thể trong hệ thống 
-- (users, branches, parking_slots, tariffs, bookings, parking_sessions, invoices, shift_reports, 
-- vouchers, user_vouchers, audit_logs, notifications), 
-- các chỉ mục tìm kiếm và các câu lệnh ALTER TABLE bổ sung cột an toàn.


-- 1. BẢNG NGƯỜI DÙNG & TÀI KHOẢN (USERS)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer', -- 'admin', 'staff', 'customer'
    avatar_url TEXT,
    loyalty_tier VARCHAR(30) DEFAULT 'Thành viên Bạc', -- 'Bạc', 'Vàng', 'Kim Cương'
    park_points INTEGER DEFAULT 1250,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG CHI NHÁNH BÃI ĐỖ XE TẠI ĐÀ NẴNG (BRANCHES)
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    district VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    total_slots INTEGER NOT NULL DEFAULT 200,
    ev_slots INTEGER NOT NULL DEFAULT 10,
    floors TEXT NOT NULL, -- JSON hoặc danh sách tầng: "G,B1,B2,B3"
    barrier_ai_status VARCHAR(50) DEFAULT 'Online (AI 99.4%)',
    status VARCHAR(30) DEFAULT 'Hoạt động', -- 'Hoạt động', 'Bảo trì', 'Đầy chỗ'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG Ô ĐỖ XE TỪNG TẦNG (PARKING_SLOTS)
CREATE TABLE IF NOT EXISTS parking_slots (
    id VARCHAR(50) PRIMARY KEY,
    branch_id VARCHAR(50) NOT NULL,
    slot_code VARCHAR(30) NOT NULL, -- VD: "B1-08", "A-14", "EV-02"
    floor VARCHAR(10) NOT NULL,      -- "G", "B1", "B2", "B3"
    slot_type VARCHAR(30) DEFAULT 'car', -- 'car', 'suv', 'ev', 'bike'
    status VARCHAR(30) DEFAULT 'available', -- 'available', 'occupied', 'reserved', 'maintenance'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 4. BẢNG CẤU HÌNH BIỂU PHÍ CƯỚC (TARIFFS)
CREATE TABLE IF NOT EXISTS tariffs (
    id VARCHAR(50) PRIMARY KEY,
    vehicle_type VARCHAR(100) NOT NULL,
    first_2_hours INTEGER NOT NULL,
    next_hour INTEGER NOT NULL,
    day_rate INTEGER NOT NULL,
    week_rate INTEGER NOT NULL,   -- Gói Tuần: 650.000đ
    month_rate INTEGER NOT NULL,  -- Gói Tháng: 1.800.000đ
    note TEXT,
    branch_id VARCHAR(50) DEFAULT 'all',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. BẢNG ĐƠN ĐẶT CHỖ TRƯỚC (BOOKINGS - HẠN VÉ 20 NGÀY)
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(50) PRIMARY KEY,
    booking_code VARCHAR(50) UNIQUE NOT NULL, -- VD: "BK-8821"
    user_id VARCHAR(50),
    customer_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    plate VARCHAR(30) NOT NULL,
    vehicle_model VARCHAR(100),
    branch_id VARCHAR(50) NOT NULL,
    slot_code VARCHAR(30) NOT NULL,
    duration_type VARCHAR(50) NOT NULL, -- '2 giờ', 'Vé ngày', 'Gói Tuần', 'Gói Tháng'
    validity_days INTEGER DEFAULT 20,    -- Thời hạn vé mặc định 20 ngày
    expiry_date TIMESTAMP NOT NULL,
    total_cost INTEGER NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(30) DEFAULT 'Đã cọc', -- 'Đã cọc', 'Hoàn tất', 'Hủy', 'Đã vào bãi'
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    scan_count INTEGER DEFAULT 0,
    qr_code_payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- 6. BẢNG PHIÊN GỬI XE THỰC TẾ (PARKING_SESSIONS)
CREATE TABLE IF NOT EXISTS parking_sessions (
    id VARCHAR(50) PRIMARY KEY,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    plate VARCHAR(30) NOT NULL,
    vehicle_type VARCHAR(50),
    branch_id VARCHAR(50) NOT NULL,
    slot_code VARCHAR(30),
    gate_in VARCHAR(50) DEFAULT 'Cổng Vào 01',
    gate_out VARCHAR(50),
    checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checkout_time TIMESTAMP,
    fee INTEGER DEFAULT 0,
    payment_method VARCHAR(50),
    payment_status VARCHAR(30) DEFAULT 'Đang gửi', -- 'Đang gửi', 'Đã thanh toán', 'Miễn phí'
    ticket_type VARCHAR(50) DEFAULT 'Vé lượt khách vãng lai', -- 'Vé đặt trước app', 'Vé lượt khách vãng lai'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- 7. BẢNG HÓA ĐƠN ĐIỆN TỬ VAT (INVOICES - NGHỊ ĐỊNH 123)
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_no VARCHAR(20) NOT NULL, -- VD: "0004928"
    serial VARCHAR(20) DEFAULT '1C26TDA',
    session_id VARCHAR(50),
    customer_name VARCHAR(100),
    plate VARCHAR(30) NOT NULL,
    vehicle_type VARCHAR(50),
    service_name VARCHAR(150) DEFAULT 'Dịch vụ trông giữ xe thông minh SmartPark',
    pre_tax_amount INTEGER NOT NULL,
    vat_rate INTEGER DEFAULT 8,
    vat_amount INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    amount_in_words TEXT NOT NULL,
    payment_method VARCHAR(50),
    signed_by VARCHAR(100) DEFAULT 'SMARTPARK ĐÀ NẴNG CA',
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lookup_code VARCHAR(50)
);

-- 8. BẢNG BIÊN BẢN BÀN GIAO CA TRỰC (SHIFT_REPORTS)
CREATE TABLE IF NOT EXISTS shift_reports (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL,
    staff_name VARCHAR(100) NOT NULL,
    branch_id VARCHAR(50) NOT NULL,
    station_name VARCHAR(100) NOT NULL,
    shift_name VARCHAR(50) NOT NULL, -- 'Ca sáng', 'Ca chiều', 'Ca đêm'
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    total_entries INTEGER DEFAULT 0,
    total_exits INTEGER DEFAULT 0,
    cash_amount INTEGER DEFAULT 0,
    online_amount INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0,
    handover_to VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. BẢNG VOUCHER KHUYẾN MÃI (VOUCHERS)
CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    pts_cost INTEGER NOT NULL DEFAULT 100,
    discount_val VARCHAR(50) NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'fixed',
    min_order_val INTEGER DEFAULT 0,
    apply_for VARCHAR(30) DEFAULT 'all',
    conditions TEXT,
    used_count INTEGER DEFAULT 0,
    max_use INTEGER DEFAULT 500,
    expiry_date VARCHAR(50),
    status VARCHAR(30) DEFAULT 'Kích hoạt',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. BẢNG BANNER QUẢNG CÁO SLIDE (AD_BANNERS)
CREATE TABLE IF NOT EXISTS ad_banners (
    id VARCHAR(50) PRIMARY KEY,
    tag VARCHAR(100),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    badge VARCHAR(50),
    location VARCHAR(150) DEFAULT 'Toàn hệ thống Đà Nẵng',
    display_order INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. BẢNG NHẬT KÝ KIỂM TOÁN AN NINH (AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    action VARCHAR(100) NOT NULL, -- VD: "MỞ BARRIER CƯỠNG CHẾ (F4)"
    user_id VARCHAR(50),
    user_name VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. BẢNG VÍ VOUCHER NGƯỜI DÙNG SỞ HỮU (USER_VOUCHERS)
CREATE TABLE IF NOT EXISTS user_vouchers (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    voucher_code VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'fixed', -- 'percent', 'fixed'
    discount_val INTEGER NOT NULL DEFAULT 20000,
    pts_cost INTEGER DEFAULT 0,
    source VARCHAR(30) DEFAULT 'claimed', -- 'redeemed', 'claimed', 'code', 'checkout'
    is_used INTEGER DEFAULT 0,
    used_at TIMESTAMP,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- MIGRATION: Thêm các cột mới nếu chưa có (idempotent ALTER TABLE)
-- ============================================================================
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS min_order_val INTEGER DEFAULT 0;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS apply_for VARCHAR(30) DEFAULT 'all';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS conditions TEXT;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS branch_id VARCHAR(50) DEFAULT 'all';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_pin VARCHAR(20) DEFAULT '000000';
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS floor VARCHAR(10) DEFAULT 'B1';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;
ALTER TABLE parking_slots ADD COLUMN IF NOT EXISTS occupied_by_plate VARCHAR(30);
ALTER TABLE parking_slots ADD COLUMN IF NOT EXISTS occupied_by_booking VARCHAR(50);
ALTER TABLE parking_slots ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE parking_slots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Đang đỗ';
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS is_early_arrival BOOLEAN DEFAULT FALSE;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS expected_checkout TIMESTAMP;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS is_overstay BOOLEAN DEFAULT FALSE;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS overstay_minutes INTEGER DEFAULT 0;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS overstay_surcharge INTEGER DEFAULT 0;
ALTER TABLE user_vouchers ADD COLUMN IF NOT EXISTS min_order_val INTEGER DEFAULT 0;
ALTER TABLE user_vouchers ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(50) DEFAULT '31/12/2027';
ALTER TABLE user_vouchers ADD COLUMN IF NOT EXISTS conditions TEXT;

-- SEED DATA MẪU
INSERT INTO users (id, email, password_hash, full_name, phone, role, loyalty_tier, park_points)
VALUES 
    ('USR-01', 'khachhang@gmail.com', '$2a$10$w8T98f/Z7e.eXp6ZvZl32Oq63vB85l0k8KkK4k5k6k7k8k9k0k1k2', 'Nguyễn An', '0988123456', 'customer', 'Thành viên Vàng', 1250),
    ('USR-02', 'staff@smartpark.vn', '$2a$10$w8T98f/Z7e.eXp6ZvZl32Oq63vB85l0k8KkK4k5k6k7k8k9k0k1k2', 'Trần Quốc Huy', '0905123789', 'staff', 'Nhân viên trực bốt', 0),
    ('USR-03', 'admin@smartpark.vn', '$2a$10$w8T98f/Z7e.eXp6ZvZl32Oq63vB85l0k8KkK4k5k6k7k8k9k0k1k2', 'Lê Hoàng Minh', '0912345678', 'admin', 'Tổng quản trị', 0)
ON CONFLICT (id) DO NOTHING;

-- SEED VOUCHER DUY NHẤT CHO THÀNH VIÊN MỚI
INSERT INTO vouchers (id, code, title, pts_cost, discount_val, discount_type, min_order_val, apply_for, conditions, max_use, expiry_date, status)
VALUES ('V-WELCOME', 'WELCOME20K', 'Voucher Chào Mừng Thành Viên Mới', 0, '20000', 'fixed', 50000, 'booking', 'Áp dụng cho đơn đặt chỗ từ 50.000đ. Mỗi tài khoản được tặng 1 lần khi đăng ký.', 99999, '31/12/2027', 'Kích hoạt')
ON CONFLICT (code) DO NOTHING;

INSERT INTO user_vouchers (id, user_id, voucher_code, title, discount_type, discount_val, pts_cost, source, is_used)
VALUES ('UV-WELCOME-USR01', 'USR-01', 'WELCOME20K', 'Voucher Chào Mừng Thành Viên Mới - Giảm 20.000đ', 'fixed', 20000, 0, 'welcome_gift', 0)
ON CONFLICT (id) DO NOTHING;

-- SEEDS 5 CHI NHÁNH ĐÀ NẴNG
INSERT INTO branches (id, name, district, address, total_slots, ev_slots, floors, barrier_ai_status, status)
VALUES
    ('BR-01', 'SmartPark - Aeon Mall Thanh Khê 1', 'Q. Thanh Khê', 'Đường Nguyễn Tất Thành, P. Tam Thuận, TP. Đà Nẵng', 240, 20, 'G,B1,B2,B3', 'Online (AI 99.4%)', 'Hoạt động'),
    ('BR-02', 'SmartPark - Vincom Plaza Ngô Quyền', 'Q. Sơn Trà', '910A Ngô Quyền, P. An Hải Bắc, TP. Đà Nẵng', 180, 15, 'B1,B2', 'Online (AI 98.9%)', 'Hoạt động'),
    ('BR-03', 'SmartPark - Sân Bay Quốc Tế Đà Nẵng', 'Q. Hải Châu', 'Đường Duy Tân, P. Hòa Thuận Tây, TP. Đà Nẵng', 450, 40, 'G,T1,T2', 'Online (AI 99.8%)', 'Hoạt động'),
    ('BR-04', 'SmartPark - Lotte Mart Đà Nẵng', 'Q. Hải Châu', '06 Nại Nam, P. Hòa Cường Bắc, TP. Đà Nẵng', 150, 10, 'G,B1', 'Online (AI 98.5%)', 'Hoạt động'),
    ('BR-05', 'SmartPark - Indochina Riverside Mall', 'Q. Hải Châu', '74 Bạch Đằng, P. Hải Châu 1, TP. Đà Nẵng', 120, 8, 'B1,B2', 'Online (AI 99.1%)', 'Hoạt động')
ON CONFLICT (id) DO NOTHING;

-- SEEDS BIỂU PHÍ CƯỚC TARIFFS
INSERT INTO tariffs (id, vehicle_type, first_2_hours, next_hour, day_rate, week_rate, month_rate, note, branch_id)
VALUES
    ('T-01', 'Ô tô con 4 - 7 chỗ', 25000, 10000, 150000, 650000, 1800000, 'Áp dụng ngày thường & cuối tuần', 'all'),
    ('T-02', 'Ô tô SUV / Bán tải', 30000, 12000, 180000, 750000, 2100000, 'Kích thước lớn trên 5m', 'all'),
    ('T-03', 'Ô tô điện EV (Có sạc)', 25000, 10000, 150000, 650000, 1800000, 'Cộng thêm tiền điện sạc EV 120kW', 'all'),
    ('T-04', 'Xe máy / Xe tay ga', 5000, 3000, 20000, 100000, 300000, 'Khuôn viên bãi xe máy tầng G', 'all')
ON CONFLICT (id) DO NOTHING;

-- SEEDS ĐƠN ĐẶT CHỖ MẪU (Để trống - phát sinh từ giao dịch thực tế)
-- SEEDS PHIÊN GỬI XE THỰC TẾ (Để trống - phát sinh từ giao dịch thực tế)
-- SEEDS HÓA ĐƠN VAT NGHỊ ĐỊNH 123 (Để trống - phát sinh từ giao dịch thực tế)

-- ============================================================================
-- SEEDS Ô ĐỖ XE (PARKING_SLOTS) - 5 CHI NHÁNH
-- ============================================================================

-- BR-01: Aeon Mall (G=bike, B1=khu A, B2=khu B+EV, B3=VIP)
INSERT INTO parking_slots (id, branch_id, slot_code, floor, slot_type, status) VALUES
  ('PS-BR01-G-01','BR-01','G-01','G','bike','available'),
  ('PS-BR01-G-02','BR-01','G-02','G','bike','available'),
  ('PS-BR01-G-03','BR-01','G-03','G','bike','occupied'),
  ('PS-BR01-G-04','BR-01','G-04','G','bike','occupied'),
  ('PS-BR01-G-05','BR-01','G-05','G','bike','available'),
  ('PS-BR01-G-06','BR-01','G-06','G','bike','reserved'),
  ('PS-BR01-G-07','BR-01','G-07','G','bike','available'),
  ('PS-BR01-G-08','BR-01','G-08','G','bike','occupied'),
  ('PS-BR01-B1-A01','BR-01','B1-A01','B1','car','available'),
  ('PS-BR01-B1-A02','BR-01','B1-A02','B1','car','occupied'),
  ('PS-BR01-B1-A03','BR-01','B1-A03','B1','car','available'),
  ('PS-BR01-B1-A04','BR-01','B1-A04','B1','car','occupied'),
  ('PS-BR01-B1-A05','BR-01','B1-A05','B1','car','available'),
  ('PS-BR01-B1-A06','BR-01','B1-A06','B1','car','reserved'),
  ('PS-BR01-B1-A07','BR-01','B1-A07','B1','car','available'),
  ('PS-BR01-B1-A08','BR-01','B1-A08','B1','car','occupied'),
  ('PS-BR01-B1-A09','BR-01','B1-A09','B1','car','available'),
  ('PS-BR01-B1-A10','BR-01','B1-A10','B1','car','occupied'),
  ('PS-BR01-B1-A11','BR-01','B1-A11','B1','car','available'),
  ('PS-BR01-B1-A12','BR-01','B1-A12','B1','car','reserved'),
  ('PS-BR01-B1-A13','BR-01','B1-A13','B1','car','available'),
  ('PS-BR01-B1-A14','BR-01','B1-A14','B1','car','occupied'),
  ('PS-BR01-B1-A15','BR-01','B1-A15','B1','car','available'),
  ('PS-BR01-B1-A16','BR-01','B1-A16','B1','car','available'),
  ('PS-BR01-B1-A17','BR-01','B1-A17','B1','car','occupied'),
  ('PS-BR01-B1-A18','BR-01','B1-A18','B1','car','available'),
  ('PS-BR01-B1-A19','BR-01','B1-A19','B1','car','reserved'),
  ('PS-BR01-B1-A20','BR-01','B1-A20','B1','car','available'),
  ('PS-BR01-B2-B01','BR-01','B2-B01','B2','car','available'),
  ('PS-BR01-B2-B02','BR-01','B2-B02','B2','car','occupied'),
  ('PS-BR01-B2-B03','BR-01','B2-B03','B2','car','available'),
  ('PS-BR01-B2-B04','BR-01','B2-B04','B2','car','occupied'),
  ('PS-BR01-B2-B05','BR-01','B2-B05','B2','car','reserved'),
  ('PS-BR01-B2-B06','BR-01','B2-B06','B2','car','available'),
  ('PS-BR01-B2-B07','BR-01','B2-B07','B2','car','occupied'),
  ('PS-BR01-B2-B08','BR-01','B2-B08','B2','car','available'),
  ('PS-BR01-B2-B09','BR-01','B2-B09','B2','car','available'),
  ('PS-BR01-B2-B10','BR-01','B2-B10','B2','car','occupied'),
  ('PS-BR01-B2-B11','BR-01','B2-B11','B2','car','available'),
  ('PS-BR01-B2-B12','BR-01','B2-B12','B2','car','reserved'),
  ('PS-BR01-B2-B13','BR-01','B2-B13','B2','car','available'),
  ('PS-BR01-B2-B14','BR-01','B2-B14','B2','car','occupied'),
  ('PS-BR01-B2-B15','BR-01','B2-B15','B2','car','available'),
  ('PS-BR01-B2-B16','BR-01','B2-B16','B2','car','available'),
  ('PS-BR01-B2-EV01','BR-01','B2-EV01','B2','ev','available'),
  ('PS-BR01-B2-EV02','BR-01','B2-EV02','B2','ev','occupied'),
  ('PS-BR01-B2-EV03','BR-01','B2-EV03','B2','ev','available'),
  ('PS-BR01-B2-EV04','BR-01','B2-EV04','B2','ev','reserved'),
  ('PS-BR01-B3-V01','BR-01','B3-V01','B3','vip','available'),
  ('PS-BR01-B3-V02','BR-01','B3-V02','B3','vip','occupied'),
  ('PS-BR01-B3-V03','BR-01','B3-V03','B3','vip','available'),
  ('PS-BR01-B3-V04','BR-01','B3-V04','B3','vip','reserved'),
  ('PS-BR01-B3-V05','BR-01','B3-V05','B3','vip','available'),
  ('PS-BR01-B3-V06','BR-01','B3-V06','B3','vip','occupied'),
  ('PS-BR01-B3-V07','BR-01','B3-V07','B3','vip','available'),
  ('PS-BR01-B3-V08','BR-01','B3-V08','B3','vip','available'),
  ('PS-BR01-B3-V09','BR-01','B3-V09','B3','vip','occupied'),
  ('PS-BR01-B3-V10','BR-01','B3-V10','B3','vip','available'),
  ('PS-BR01-B3-V11','BR-01','B3-V11','B3','vip','reserved'),
  ('PS-BR01-B3-V12','BR-01','B3-V12','B3','vip','available')
ON CONFLICT (id) DO NOTHING;

-- BR-02: Vincom (B1=khu A, B2=khu B+EV)
INSERT INTO parking_slots (id, branch_id, slot_code, floor, slot_type, status) VALUES
  ('PS-BR02-B1-A01','BR-02','B1-A01','B1','car','available'),
  ('PS-BR02-B1-A02','BR-02','B1-A02','B1','car','occupied'),
  ('PS-BR02-B1-A03','BR-02','B1-A03','B1','car','available'),
  ('PS-BR02-B1-A04','BR-02','B1-A04','B1','car','occupied'),
  ('PS-BR02-B1-A05','BR-02','B1-A05','B1','car','available'),
  ('PS-BR02-B1-A06','BR-02','B1-A06','B1','car','reserved'),
  ('PS-BR02-B1-A07','BR-02','B1-A07','B1','car','available'),
  ('PS-BR02-B1-A08','BR-02','B1-A08','B1','car','occupied'),
  ('PS-BR02-B1-A09','BR-02','B1-A09','B1','car','available'),
  ('PS-BR02-B1-A10','BR-02','B1-A10','B1','car','occupied'),
  ('PS-BR02-B1-A11','BR-02','B1-A11','B1','car','available'),
  ('PS-BR02-B1-A12','BR-02','B1-A12','B1','car','reserved'),
  ('PS-BR02-B1-A13','BR-02','B1-A13','B1','car','available'),
  ('PS-BR02-B1-A14','BR-02','B1-A14','B1','car','occupied'),
  ('PS-BR02-B1-A15','BR-02','B1-A15','B1','car','available'),
  ('PS-BR02-B1-A16','BR-02','B1-A16','B1','car','available'),
  ('PS-BR02-B1-A17','BR-02','B1-A17','B1','car','occupied'),
  ('PS-BR02-B1-A18','BR-02','B1-A18','B1','car','available'),
  ('PS-BR02-B2-B01','BR-02','B2-B01','B2','car','available'),
  ('PS-BR02-B2-B02','BR-02','B2-B02','B2','car','occupied'),
  ('PS-BR02-B2-B03','BR-02','B2-B03','B2','car','available'),
  ('PS-BR02-B2-B04','BR-02','B2-B04','B2','car','reserved'),
  ('PS-BR02-B2-B05','BR-02','B2-B05','B2','car','available'),
  ('PS-BR02-B2-B06','BR-02','B2-B06','B2','car','occupied'),
  ('PS-BR02-B2-B07','BR-02','B2-B07','B2','car','available'),
  ('PS-BR02-B2-B08','BR-02','B2-B08','B2','car','occupied'),
  ('PS-BR02-B2-B09','BR-02','B2-B09','B2','car','available'),
  ('PS-BR02-B2-B10','BR-02','B2-B10','B2','car','available'),
  ('PS-BR02-B2-B11','BR-02','B2-B11','B2','car','reserved'),
  ('PS-BR02-B2-B12','BR-02','B2-B12','B2','car','occupied'),
  ('PS-BR02-B2-B13','BR-02','B2-B13','B2','car','available'),
  ('PS-BR02-B2-B14','BR-02','B2-B14','B2','car','available'),
  ('PS-BR02-B2-B15','BR-02','B2-B15','B2','car','occupied'),
  ('PS-BR02-B2-B16','BR-02','B2-B16','B2','car','available'),
  ('PS-BR02-B2-EV01','BR-02','B2-EV01','B2','ev','available'),
  ('PS-BR02-B2-EV02','BR-02','B2-EV02','B2','ev','occupied')
ON CONFLICT (id) DO NOTHING;

-- BR-03: Sân Bay (G=khu G+bike, T1=khu T+EV, T2=khu P)
INSERT INTO parking_slots (id, branch_id, slot_code, floor, slot_type, status) VALUES
  ('PS-BR03-G-01','BR-03','G-01','G','car','available'),
  ('PS-BR03-G-02','BR-03','G-02','G','car','occupied'),
  ('PS-BR03-G-03','BR-03','G-03','G','car','available'),
  ('PS-BR03-G-04','BR-03','G-04','G','car','occupied'),
  ('PS-BR03-G-05','BR-03','G-05','G','car','available'),
  ('PS-BR03-G-06','BR-03','G-06','G','car','reserved'),
  ('PS-BR03-G-07','BR-03','G-07','G','car','available'),
  ('PS-BR03-G-08','BR-03','G-08','G','car','occupied'),
  ('PS-BR03-G-09','BR-03','G-09','G','car','available'),
  ('PS-BR03-G-10','BR-03','G-10','G','car','available'),
  ('PS-BR03-G-11','BR-03','G-11','G','car','occupied'),
  ('PS-BR03-G-12','BR-03','G-12','G','car','available'),
  ('PS-BR03-G-13','BR-03','G-13','G','car','reserved'),
  ('PS-BR03-G-14','BR-03','G-14','G','car','available'),
  ('PS-BR03-G-15','BR-03','G-15','G','car','occupied'),
  ('PS-BR03-G-16','BR-03','G-16','G','car','available'),
  ('PS-BR03-G-17','BR-03','G-17','G','car','available'),
  ('PS-BR03-G-18','BR-03','G-18','G','car','occupied'),
  ('PS-BR03-G-19','BR-03','G-19','G','car','available'),
  ('PS-BR03-G-20','BR-03','G-20','G','car','reserved'),
  ('PS-BR03-G-21','BR-03','G-21','G','car','available'),
  ('PS-BR03-G-22','BR-03','G-22','G','car','occupied'),
  ('PS-BR03-G-23','BR-03','G-23','G','car','available'),
  ('PS-BR03-G-24','BR-03','G-24','G','car','available'),
  ('PS-BR03-G-25','BR-03','G-25','G','car','occupied'),
  ('PS-BR03-G-26','BR-03','G-26','G','car','available'),
  ('PS-BR03-G-27','BR-03','G-27','G','car','reserved'),
  ('PS-BR03-G-28','BR-03','G-28','G','car','available'),
  ('PS-BR03-G-29','BR-03','G-29','G','car','occupied'),
  ('PS-BR03-G-30','BR-03','G-30','G','car','available'),
  ('PS-BR03-G-BK01','BR-03','G-BK01','G','bike','available'),
  ('PS-BR03-G-BK02','BR-03','G-BK02','G','bike','occupied'),
  ('PS-BR03-G-BK03','BR-03','G-BK03','G','bike','available'),
  ('PS-BR03-G-BK04','BR-03','G-BK04','G','bike','available'),
  ('PS-BR03-G-BK05','BR-03','G-BK05','G','bike','reserved'),
  ('PS-BR03-G-BK06','BR-03','G-BK06','G','bike','available'),
  ('PS-BR03-G-BK07','BR-03','G-BK07','G','bike','occupied'),
  ('PS-BR03-G-BK08','BR-03','G-BK08','G','bike','available'),
  ('PS-BR03-G-BK09','BR-03','G-BK09','G','bike','available'),
  ('PS-BR03-G-BK10','BR-03','G-BK10','G','bike','occupied'),
  ('PS-BR03-T1-T01','BR-03','T1-T01','T1','car','available'),
  ('PS-BR03-T1-T02','BR-03','T1-T02','T1','car','occupied'),
  ('PS-BR03-T1-T03','BR-03','T1-T03','T1','car','available'),
  ('PS-BR03-T1-T04','BR-03','T1-T04','T1','car','reserved'),
  ('PS-BR03-T1-T05','BR-03','T1-T05','T1','car','available'),
  ('PS-BR03-T1-T06','BR-03','T1-T06','T1','car','occupied'),
  ('PS-BR03-T1-T07','BR-03','T1-T07','T1','car','available'),
  ('PS-BR03-T1-T08','BR-03','T1-T08','T1','car','occupied'),
  ('PS-BR03-T1-T09','BR-03','T1-T09','T1','car','available'),
  ('PS-BR03-T1-T10','BR-03','T1-T10','T1','car','available'),
  ('PS-BR03-T1-T11','BR-03','T1-T11','T1','car','reserved'),
  ('PS-BR03-T1-T12','BR-03','T1-T12','T1','car','occupied'),
  ('PS-BR03-T1-T13','BR-03','T1-T13','T1','car','available'),
  ('PS-BR03-T1-T14','BR-03','T1-T14','T1','car','available'),
  ('PS-BR03-T1-T15','BR-03','T1-T15','T1','car','occupied'),
  ('PS-BR03-T1-T16','BR-03','T1-T16','T1','car','available'),
  ('PS-BR03-T1-T17','BR-03','T1-T17','T1','car','reserved'),
  ('PS-BR03-T1-T18','BR-03','T1-T18','T1','car','available'),
  ('PS-BR03-T1-T19','BR-03','T1-T19','T1','car','occupied'),
  ('PS-BR03-T1-T20','BR-03','T1-T20','T1','car','available'),
  ('PS-BR03-T1-EV01','BR-03','T1-EV01','T1','ev','available'),
  ('PS-BR03-T1-EV02','BR-03','T1-EV02','T1','ev','occupied'),
  ('PS-BR03-T1-EV03','BR-03','T1-EV03','T1','ev','available'),
  ('PS-BR03-T1-EV04','BR-03','T1-EV04','T1','ev','available'),
  ('PS-BR03-T1-EV05','BR-03','T1-EV05','T1','ev','reserved'),
  ('PS-BR03-T2-P01','BR-03','T2-P01','T2','car','available'),
  ('PS-BR03-T2-P02','BR-03','T2-P02','T2','car','occupied'),
  ('PS-BR03-T2-P03','BR-03','T2-P03','T2','car','available'),
  ('PS-BR03-T2-P04','BR-03','T2-P04','T2','car','available'),
  ('PS-BR03-T2-P05','BR-03','T2-P05','T2','car','reserved'),
  ('PS-BR03-T2-P06','BR-03','T2-P06','T2','car','occupied'),
  ('PS-BR03-T2-P07','BR-03','T2-P07','T2','car','available'),
  ('PS-BR03-T2-P08','BR-03','T2-P08','T2','car','available'),
  ('PS-BR03-T2-P09','BR-03','T2-P09','T2','car','occupied'),
  ('PS-BR03-T2-P10','BR-03','T2-P10','T2','car','available'),
  ('PS-BR03-T2-P11','BR-03','T2-P11','T2','car','reserved'),
  ('PS-BR03-T2-P12','BR-03','T2-P12','T2','car','available'),
  ('PS-BR03-T2-P13','BR-03','T2-P13','T2','car','occupied'),
  ('PS-BR03-T2-P14','BR-03','T2-P14','T2','car','available'),
  ('PS-BR03-T2-P15','BR-03','T2-P15','T2','car','available'),
  ('PS-BR03-T2-P16','BR-03','T2-P16','T2','car','occupied'),
  ('PS-BR03-T2-P17','BR-03','T2-P17','T2','car','available'),
  ('PS-BR03-T2-P18','BR-03','T2-P18','T2','car','reserved'),
  ('PS-BR03-T2-P19','BR-03','T2-P19','T2','car','available'),
  ('PS-BR03-T2-P20','BR-03','T2-P20','T2','car','occupied')
ON CONFLICT (id) DO NOTHING;

-- BR-04: Lotte (G=khu G, B1=khu A+EV)
INSERT INTO parking_slots (id, branch_id, slot_code, floor, slot_type, status) VALUES
  ('PS-BR04-G-01','BR-04','G-01','G','car','available'),
  ('PS-BR04-G-02','BR-04','G-02','G','car','occupied'),
  ('PS-BR04-G-03','BR-04','G-03','G','car','available'),
  ('PS-BR04-G-04','BR-04','G-04','G','car','reserved'),
  ('PS-BR04-G-05','BR-04','G-05','G','car','available'),
  ('PS-BR04-G-06','BR-04','G-06','G','car','occupied'),
  ('PS-BR04-G-07','BR-04','G-07','G','car','available'),
  ('PS-BR04-G-08','BR-04','G-08','G','car','available'),
  ('PS-BR04-G-09','BR-04','G-09','G','car','occupied'),
  ('PS-BR04-G-10','BR-04','G-10','G','car','available'),
  ('PS-BR04-G-11','BR-04','G-11','G','car','reserved'),
  ('PS-BR04-G-12','BR-04','G-12','G','car','available'),
  ('PS-BR04-B1-A01','BR-04','B1-A01','B1','car','available'),
  ('PS-BR04-B1-A02','BR-04','B1-A02','B1','car','occupied'),
  ('PS-BR04-B1-A03','BR-04','B1-A03','B1','car','available'),
  ('PS-BR04-B1-A04','BR-04','B1-A04','B1','car','occupied'),
  ('PS-BR04-B1-A05','BR-04','B1-A05','B1','car','available'),
  ('PS-BR04-B1-A06','BR-04','B1-A06','B1','car','reserved'),
  ('PS-BR04-B1-A07','BR-04','B1-A07','B1','car','available'),
  ('PS-BR04-B1-A08','BR-04','B1-A08','B1','car','occupied'),
  ('PS-BR04-B1-A09','BR-04','B1-A09','B1','car','available'),
  ('PS-BR04-B1-A10','BR-04','B1-A10','B1','car','available'),
  ('PS-BR04-B1-A11','BR-04','B1-A11','B1','car','occupied'),
  ('PS-BR04-B1-A12','BR-04','B1-A12','B1','car','available'),
  ('PS-BR04-B1-A13','BR-04','B1-A13','B1','car','reserved'),
  ('PS-BR04-B1-EV01','BR-04','B1-EV01','B1','ev','available'),
  ('PS-BR04-B1-EV02','BR-04','B1-EV02','B1','ev','occupied')
ON CONFLICT (id) DO NOTHING;

-- BR-05: Indochina (B1=khu A, B2=khu B+EV)
INSERT INTO parking_slots (id, branch_id, slot_code, floor, slot_type, status) VALUES
  ('PS-BR05-B1-A01','BR-05','B1-A01','B1','car','available'),
  ('PS-BR05-B1-A02','BR-05','B1-A02','B1','car','occupied'),
  ('PS-BR05-B1-A03','BR-05','B1-A03','B1','car','available'),
  ('PS-BR05-B1-A04','BR-05','B1-A04','B1','car','occupied'),
  ('PS-BR05-B1-A05','BR-05','B1-A05','B1','car','available'),
  ('PS-BR05-B1-A06','BR-05','B1-A06','B1','car','reserved'),
  ('PS-BR05-B1-A07','BR-05','B1-A07','B1','car','available'),
  ('PS-BR05-B1-A08','BR-05','B1-A08','B1','car','occupied'),
  ('PS-BR05-B1-A09','BR-05','B1-A09','B1','car','available'),
  ('PS-BR05-B1-A10','BR-05','B1-A10','B1','car','available'),
  ('PS-BR05-B1-A11','BR-05','B1-A11','B1','car','occupied'),
  ('PS-BR05-B1-A12','BR-05','B1-A12','B1','car','available'),
  ('PS-BR05-B1-A13','BR-05','B1-A13','B1','car','reserved'),
  ('PS-BR05-B1-A14','BR-05','B1-A14','B1','car','available'),
  ('PS-BR05-B2-B01','BR-05','B2-B01','B2','car','available'),
  ('PS-BR05-B2-B02','BR-05','B2-B02','B2','car','occupied'),
  ('PS-BR05-B2-B03','BR-05','B2-B03','B2','car','available'),
  ('PS-BR05-B2-B04','BR-05','B2-B04','B2','car','reserved'),
  ('PS-BR05-B2-B05','BR-05','B2-B05','B2','car','available'),
  ('PS-BR05-B2-B06','BR-05','B2-B06','B2','car','occupied'),
  ('PS-BR05-B2-B07','BR-05','B2-B07','B2','car','available'),
  ('PS-BR05-B2-B08','BR-05','B2-B08','B2','car','available'),
  ('PS-BR05-B2-B09','BR-05','B2-B09','B2','car','occupied'),
  ('PS-BR05-B2-B10','BR-05','B2-B10','B2','car','available'),
  ('PS-BR05-B2-B11','BR-05','B2-B11','B2','car','reserved'),
  ('PS-BR05-B2-B12','BR-05','B2-B12','B2','car','available'),
  ('PS-BR05-B2-EV01','BR-05','B2-EV01','B2','ev','available'),
  ('PS-BR05-B2-EV02','BR-05','B2-EV02','B2','ev','occupied')
ON CONFLICT (id) DO NOTHING;
