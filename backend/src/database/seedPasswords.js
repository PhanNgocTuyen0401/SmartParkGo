import bcrypt from 'bcryptjs';
import { query } from './db.js';

async function seedPasswords() {
  try {
    const p1 = await bcrypt.hash('khachhang@123password', 10);
    const p2 = await bcrypt.hash('staff@123password', 10);
    const p3 = await bcrypt.hash('admin@123password', 10);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [p1, 'USR-01']);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [p2, 'USR-02']);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [p3, 'USR-03']);

    console.log('✅ Đã cập nhật password hash bcrypt chuẩn cho các tài khoản seed USR-01, USR-02, USR-03.');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi cập nhật mật khẩu seed:', err);
    process.exit(1);
  }
}

seedPasswords();
