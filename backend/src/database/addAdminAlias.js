import bcrypt from 'bcryptjs';
import { query } from './db.js';

// addAdminAlias.js & seedPasswords.js – Quản lý Mật khẩu Quản trị
// Chức năng: Sử dụng thư viện bcryptjs tạo mật khẩu mã hóa một chiều cho tài khoản Quản trị viên 
// (admin@smartpark.vn / admin@gmail.com) với mã PIN bảo mật 888888.

async function main() {
  const strongAdminPass = 'Admin@SmartPark2026!';
  const hash = await bcrypt.hash(strongAdminPass, 10);
  const defaultPin = '888888';

  // 1. Cấu hình admin@smartpark.vn
  await query(
    `INSERT INTO users (id, email, password_hash, full_name, phone, role, loyalty_tier, park_points, security_pin)
     VALUES ('USR-ADMIN-01', 'admin@smartpark.vn', $1, 'Quản Trị Viên Trưởng', '0905999888', 'admin', 'Quản Trị Viên', 9999, $2)
     ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = $1, security_pin = $2`,
    [hash, defaultPin]
  );

  // 2. Cấu hình admin@gmail.com
  await query(
    `INSERT INTO users (id, email, password_hash, full_name, phone, role, loyalty_tier, park_points, security_pin)
     VALUES ('USR-ADMIN-02', 'admin@gmail.com', $1, 'Quản Trị Viên Dự Phòng', '0905999777', 'admin', 'Quản Trị Viên', 9999, $2)
     ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = $1, security_pin = $2`,
    [hash, defaultPin]
  );

  console.log('✅ Đã cập nhật tài khoản Admin mạnh mẽ:');
  console.log('👉 Email: admin@smartpark.vn (hoặc admin@gmail.com)');
  console.log(`👉 Mật khẩu mạnh: ${strongAdminPass}`);
  console.log(`👉 Mã PIN bảo mật quản trị: ${defaultPin}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
