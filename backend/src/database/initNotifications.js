import { query } from './db.js';

export async function initNotificationsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(30) DEFAULT 'offer',
        title VARCHAR(255) NOT NULL,
        title_en VARCHAR(255),
        message TEXT NOT NULL,
        message_en TEXT,
        audience VARCHAR(50) DEFAULT 'all',
        voucher_code VARCHAR(50),
        voucher_data TEXT,
        sender VARCHAR(100) DEFAULT 'Ban Quản Trị SmartPark',
        unread BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Kiểm tra xem đã có thông báo mẫu chưa
    const countRes = await query('SELECT COUNT(*) as count FROM notifications');
    const count = parseInt(countRes.rows[0]?.count || 0, 10);
    if (count === 0) {
      await query(`
        INSERT INTO notifications (id, type, title, title_en, message, message_en, audience, voucher_code, sender, unread, created_at)
        VALUES 
        ('NOTIF-01', 'offer', 'Chào mừng gia nhập SmartPark!', 'Welcome to SmartPark!', 'Tài khoản của bạn đã kích hoạt thành công! Tặng ngay 500 ParkPoints và Voucher chào mừng WELCOME20K giảm 20.000đ cho đơn từ 50.000đ.', 'Your account is active! Enjoy 500 points & 20,000đ welcome voucher WELCOME20K.', 'all', 'WELCOME20K', 'Ban Quản Trị SmartPark', true, NOW() - INTERVAL '5 minutes'),
        ('NOTIF-02', 'system', 'Hệ thống trạm sạc EV 120kW đã hoạt động', '120kW EV Charging Station Online', 'Toàn bộ 20 trụ sạc nhanh DC 120kW tại hầm B2 Aeon Mall & Vincom Ngô Quyền đã chính thức đưa vào khai thác.', 'Fast charging EV stations at Aeon Mall & Vincom Ngo Quyen are fully operational.', 'all', NULL, 'BQL Hạ Tầng Kỹ Thuật', false, NOW() - INTERVAL '1 hour'),
        ('NOTIF-03', 'offer', 'Ưu đãi cuối tuần: Giảm 25% gói gửi xe', 'Weekend Special: 25% Off', 'Giảm 25% cước phí cho tất cả khách hàng đặt chỗ trước vào thứ Bảy và Chủ Nhật tuần này.', '25% discount for all advance bookings this weekend.', 'all', 'PARK25WEEKEND', 'Ban Quản Trị SmartPark', false, NOW() - INTERVAL '2 hours')
      `);
      console.log('✅ Đã tạo bảng notifications và nạp thông báo ban đầu thành công');
    }
  } catch (err) {
    console.error('❌ Lỗi khởi tạo bảng notifications:', err.message);
  }
}
